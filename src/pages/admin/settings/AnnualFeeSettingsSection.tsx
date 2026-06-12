import { useEffect, useMemo, useRef, useState } from "react";
import {
  adjustAnnualFeeSchedule,
  getAnnualFeeSchedule,
  getCountryExtensions,
  getFeeRules,
  updateCountryExtension,
  updateFeeRule,
  type AnnualFeeScheduleItem,
  type CountryExtension,
  type FeeRule,
} from "../../../api/settings";
import { getApiErrorMessage } from "../../../api/client";
import { Button } from "../../../components/common/Button";
import { IconButton } from "../../../components/common/IconButton";
import { Modal } from "../../../components/common/Modal";
import { TableLoadingRows } from "../../../components/common/TableLoadingRows";

/**
 * @relatedFR FR-LEGAL-24
 * @relatedUI UI-LEGAL-07
 * @description SETTINGS-11(항목8~10): 연차료 납부 설정 — 유지 결정 회차별 연장 기간(모달 편집 +
 * 예상 납부일·분기 미리보기), 국가별 연차료 규칙(행 편집 + 섹션 단일 저장), 납부 예정일
 * 목록(국가 필터 캐시 + hover 상세 모달)을 관리한다.
 */
export function AnnualFeeSettingsSection() {
  const [extensions, setExtensions] = useState<CountryExtension[]>([]);
  // 항목8: 행 단위 저장 대신 초안(draft)을 모아 단일 버튼으로 저장한다.
  const [extensionDrafts, setExtensionDrafts] = useState<Record<string, number[]>>({});
  const [editingExtensionCountry, setEditingExtensionCountry] = useState<string | null>(null);
  const [isSavingExtensions, setIsSavingExtensions] = useState(false);
  const [extensionMessage, setExtensionMessage] = useState("");

  const [feeRules, setFeeRules] = useState<FeeRule[]>([]);
  const [feeRuleDrafts, setFeeRuleDrafts] = useState<Record<string, FeeRuleDraft>>({});
  const [isSavingFeeRules, setIsSavingFeeRules] = useState(false);
  const [feeRuleMessage, setFeeRuleMessage] = useState("");

  const [schedule, setSchedule] = useState<AnnualFeeScheduleItem[]>([]);
  const [scheduleCountry, setScheduleCountry] = useState("ALL");
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [scheduleDetailPatentId, setScheduleDetailPatentId] = useState<string | null>(null);
  // 항목10: 국가 필터 결과 캐시 — 같은 국가 재선택 시 로딩 없이 즉시 표시한다.
  const scheduleCacheRef = useRef(new Map<string, AnnualFeeScheduleItem[]>());

  useEffect(() => {
    getCountryExtensions().then(setExtensions).catch(() => setExtensions([]));
    getFeeRules().then(setFeeRules).catch(() => setFeeRules([]));
  }, []);

  useEffect(() => {
    let isMounted = true;
    const cached = scheduleCacheRef.current.get(scheduleCountry);
    if (cached) {
      setSchedule(cached);
      setScheduleMessage("");
      return;
    }
    setIsScheduleLoading(true);
    getAnnualFeeSchedule(scheduleCountry)
      .then((nextSchedule) => {
        if (!isMounted) return;
        scheduleCacheRef.current.set(scheduleCountry, nextSchedule);
        setSchedule(nextSchedule);
        setScheduleMessage("");
      })
      .catch((error) => {
        if (!isMounted) return;
        setSchedule([]);
        setScheduleMessage(getApiErrorMessage(error, "연차료 예정표를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (isMounted) setIsScheduleLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [scheduleCountry]);

  const dirtyExtensionCountries = useMemo(
    () =>
      extensions
        .filter((extension) => {
          const draft = extensionDrafts[extension.country];
          return draft && !areRoundsEqual(draft, normalizeRounds(extension));
        })
        .map((extension) => extension.country),
    [extensionDrafts, extensions],
  );

  const dirtyFeeRuleCountries = useMemo(
    () =>
      feeRules
        .filter((rule) => {
          const draft = feeRuleDrafts[rule.country];
          return (
            draft &&
            (draft.basis !== rule.basis ||
              draft.initialLumpYears !== rule.initialLumpYears ||
              draft.cycleMonths !== rule.cycleMonths)
          );
        })
        .map((rule) => rule.country),
    [feeRuleDrafts, feeRules],
  );

  async function handleSaveExtensions() {
    setIsSavingExtensions(true);
    setExtensionMessage("");
    const failures: string[] = [];
    for (const country of dirtyExtensionCountries) {
      try {
        const updated = await updateCountryExtension(country, extensionDrafts[country]);
        setExtensions((prev) => prev.map((extension) => (extension.country === country ? updated : extension)));
        setExtensionDrafts((prev) => {
          const next = { ...prev };
          delete next[country];
          return next;
        });
      } catch (error) {
        failures.push(`${country}: ${getApiErrorMessage(error, "저장 실패")}`);
      }
    }
    setIsSavingExtensions(false);
    setExtensionMessage(failures.length > 0 ? failures.join(" / ") : "연장 기간 설정이 저장되었습니다.");
  }

  async function handleSaveFeeRules() {
    setIsSavingFeeRules(true);
    setFeeRuleMessage("");
    const failures: string[] = [];
    for (const country of dirtyFeeRuleCountries) {
      try {
        const updated = await updateFeeRule(country, feeRuleDrafts[country]);
        if (updated) {
          setFeeRules((prev) => prev.map((rule) => (rule.country === country ? updated : rule)));
        }
        setFeeRuleDrafts((prev) => {
          const next = { ...prev };
          delete next[country];
          return next;
        });
      } catch (error) {
        failures.push(`${country}: ${getApiErrorMessage(error, "저장 실패")}`);
      }
    }
    setIsSavingFeeRules(false);
    setFeeRuleMessage(failures.length > 0 ? failures.join(" / ") : "국가별 연차료 규칙이 저장되었습니다.");
  }

  async function handleAdjustSchedule(item: AnnualFeeScheduleItem, adjustedDueDate: string, reason: string) {
    const updated = await adjustAnnualFeeSchedule(item.patentId, adjustedDueDate, reason);
    setSchedule((prev) => {
      const next = prev.map((row) => (row.patentId === item.patentId ? updated : row));
      // 캐시에도 반영해 국가 필터를 오가도 조정 결과가 유지되게 한다.
      scheduleCacheRef.current.set(scheduleCountry, next);
      return next;
    });
    setScheduleMessage(`${item.managementNumber} 납부 예정일이 조정되었습니다.`);
  }

  const editingExtension = extensions.find((extension) => extension.country === editingExtensionCountry) ?? null;
  const scheduleDetailItem = schedule.find((item) => item.patentId === scheduleDetailPatentId) ?? null;

  return (
    <>
      <section className="section">
        <div className="section-header">
          <div>
            <h2>유지 결정 시 납부일 연장 기간</h2>
            <p>관리자가 특허를 유지 처리할 때마다 다음 납부 예정일이 연장됩니다. 회차별로 다른 기간을 설정할 수 있습니다.</p>
          </div>
          <Button
            disabled={isSavingExtensions || dirtyExtensionCountries.length === 0}
            onClick={handleSaveExtensions}
            type="button"
          >
            {isSavingExtensions
              ? "저장 중…"
              : dirtyExtensionCountries.length > 0
                ? `저장 (${dirtyExtensionCountries.length}개국 변경)`
                : "저장"}
          </Button>
        </div>
        {extensionMessage ? <p className="notice notice-compact" style={{ marginBottom: "0.75rem" }}>{extensionMessage}</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>국가</th>
                <th>회차별 연장 기간</th>
                <th style={{ width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {extensions.map((extension) => {
                const rounds = extensionDrafts[extension.country] ?? normalizeRounds(extension);
                const isDirty = dirtyExtensionCountries.includes(extension.country);
                return (
                  <tr className={isDirty ? "dirty-row" : undefined} key={extension.country}>
                    <td><strong>{extension.label}</strong></td>
                    <td>
                      <div className="extension-round-chips">
                        {rounds.map((months, index) => (
                          <span className="extension-round-chip" key={index}>
                            {index + 1}회차 {months}개월
                          </span>
                        ))}
                        {rounds.length > 1 ? (
                          <span className="table-subtext">{rounds.length + 1}회차부터는 마지막 값 반복</span>
                        ) : null}
                        {isDirty ? <span className="badge badge-warning">변경됨</span> : null}
                      </div>
                    </td>
                    <td>
                      <Button
                        onClick={() => setEditingExtensionCountry(extension.country)}
                        type="button"
                        variant="secondary"
                      >
                        변경
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {extensions.length === 0 ? (
                <tr><td className="empty-table-cell" colSpan={3}>연장 기간 설정을 불러오지 못했습니다.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="form-helper-text" style={{ marginTop: "0.5rem" }}>
          미국 특허는 등록일 기준 3.5년, 7.5년, 11.5년 유지료 일정을 우선 적용합니다.
        </p>
      </section>

      {/* I4(FEE-06): 국가별 연차료 규칙 — 행에서 바로 수정하고 단일 버튼으로 저장한다. */}
      <section className="section">
        <div className="section-header">
          <div>
            <h2>국가별 연차료 규칙</h2>
            <p>기산일(출원일/등록일), 설정등록 시 일괄 납부 연차 수, 납부 주기를 국가별로 조정합니다.</p>
          </div>
          <Button
            disabled={isSavingFeeRules || dirtyFeeRuleCountries.length === 0}
            onClick={handleSaveFeeRules}
            type="button"
          >
            {isSavingFeeRules
              ? "저장 중…"
              : dirtyFeeRuleCountries.length > 0
                ? `저장 (${dirtyFeeRuleCountries.length}개국 변경)`
                : "저장"}
          </Button>
        </div>
        {feeRuleMessage ? <p className="notice notice-compact" style={{ marginBottom: "0.75rem" }}>{feeRuleMessage}</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>국가</th>
                <th>기산일</th>
                <th>일괄 납부 연차</th>
                <th>납부 주기(개월)</th>
                <th>현재 규칙</th>
              </tr>
            </thead>
            <tbody>
              {feeRules.map((rule) => {
                const draft = feeRuleDrafts[rule.country] ?? toFeeRuleDraft(rule);
                const isDirty = dirtyFeeRuleCountries.includes(rule.country);
                const updateDraft = (patch: Partial<FeeRuleDraft>) =>
                  setFeeRuleDrafts((prev) => ({ ...prev, [rule.country]: { ...draft, ...patch } }));
                return (
                  <tr className={isDirty ? "dirty-row" : undefined} key={rule.country}>
                    {/* 항목9: countryLabel에 이미 (KR) 표기가 있어 국가 코드를 중복 출력하지 않는다. */}
                    <td>
                      <strong className="nowrap-cell">{rule.countryLabel}</strong>
                      {isDirty ? <span className="table-subtext">변경됨</span> : null}
                    </td>
                    <td>
                      <select
                        aria-label={`${rule.country} 기산일`}
                        onChange={(event) => updateDraft({ basis: event.target.value as FeeRule["basis"] })}
                        value={draft.basis}
                      >
                        <option value="APPLICATION_DATE">출원일</option>
                        <option value="REGISTRATION_DATE">등록일</option>
                      </select>
                    </td>
                    <td>
                      <input
                        aria-label={`${rule.country} 일괄 납부 연차`}
                        max={10}
                        min={0}
                        onChange={(event) => updateDraft({ initialLumpYears: Number(event.target.value) })}
                        type="number"
                        value={draft.initialLumpYears}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${rule.country} 납부 주기(개월)`}
                        max={120}
                        min={1}
                        onChange={(event) => updateDraft({ cycleMonths: Number(event.target.value) })}
                        type="number"
                        value={draft.cycleMonths}
                      />
                    </td>
                    <td className="table-subtext rule-label-cell">{rule.ruleLabel}</td>
                  </tr>
                );
              })}
              {feeRules.length === 0 ? (
                <tr><td className="empty-table-cell" colSpan={5}>연차료 규칙을 불러오지 못했습니다.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>국가별 연차료 납부 예정일</h2>
            <p>실제 특허 데이터와 국가별 계산 규칙으로 산정된 미래 납부 예정일입니다. 행에 마우스를 올리면 규칙·조정 버튼이 나타납니다.</p>
          </div>
          <label className="form-field" style={{ maxWidth: 220 }}>
            <span className="form-label-text">국가</span>
            <select onChange={(event) => setScheduleCountry(event.target.value)} value={scheduleCountry}>
              <option value="ALL">전체</option>
              {extensions.map((extension) => (
                <option key={extension.country} value={extension.country}>{extension.label}</option>
              ))}
            </select>
          </label>
        </div>
        {scheduleMessage ? <p className="notice notice-compact" style={{ marginBottom: "1rem" }}>{scheduleMessage}</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>특허</th>
                <th>국가 구분</th>
                <th>기준일</th>
                <th>현재 예정일</th>
                <th style={{ width: 110 }} />
              </tr>
            </thead>
            <tbody>
              {isScheduleLoading ? (
                <TableLoadingRows columns={5} />
              ) : schedule.slice(0, 20).map((item) => (
                <tr className="hover-action-row" key={item.patentId}>
                  <td>
                    <strong>{item.title}</strong>
                    <span className="table-subtext">{item.managementNumber}</span>
                  </td>
                  <td>
                    <span className={item.domesticPatent ? "badge badge-success" : "badge badge-neutral"}>
                      {item.domesticPatent ? "국내특허" : "해외특허"}
                    </span>
                    <span className="table-subtext">{item.country}</span>
                  </td>
                  <td>{item.annualFeeBaseDate ?? "-"}</td>
                  <td>
                    <strong>{item.effectiveAnnualFeeDueDate ?? item.nextAnnualFeeDueDate ?? "-"}</strong>
                    {item.adjustedAnnualFeeDueDate ? <span className="table-subtext">조정됨</span> : null}
                  </td>
                  <td>
                    <button
                      className="hover-action-button"
                      onClick={() => setScheduleDetailPatentId(item.patentId)}
                      type="button"
                    >
                      규칙·조정
                    </button>
                  </td>
                </tr>
              ))}
              {!isScheduleLoading && schedule.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan={5}>연차료 납부 예정일 데이터가 없습니다.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {editingExtension ? (
        <ExtensionRoundsModal
          extension={editingExtension}
          initialRounds={extensionDrafts[editingExtension.country] ?? normalizeRounds(editingExtension)}
          onApply={(rounds) => {
            setExtensionDrafts((prev) => ({ ...prev, [editingExtension.country]: rounds }));
            setEditingExtensionCountry(null);
          }}
          onClose={() => setEditingExtensionCountry(null)}
        />
      ) : null}

      {scheduleDetailItem ? (
        <ScheduleDetailModal
          item={scheduleDetailItem}
          onAdjust={(adjustedDueDate, reason) => handleAdjustSchedule(scheduleDetailItem, adjustedDueDate, reason)}
          onClose={() => setScheduleDetailPatentId(null)}
        />
      ) : null}
    </>
  );
}

interface FeeRuleDraft {
  basis: FeeRule["basis"];
  initialLumpYears: number;
  cycleMonths: number;
}

function toFeeRuleDraft(rule: FeeRule): FeeRuleDraft {
  return { basis: rule.basis, initialLumpYears: rule.initialLumpYears, cycleMonths: rule.cycleMonths };
}

function normalizeRounds(extension: CountryExtension): number[] {
  if (extension.extensionMonthsByRound && extension.extensionMonthsByRound.length > 0) {
    return extension.extensionMonthsByRound;
  }
  return [extension.extensionMonths];
}

function areRoundsEqual(first: number[], second: number[]) {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

/**
 * @relatedFR FR-LEGAL-24
 * @description 항목8: 회차별 연장 기간 편집 모달 — 회차를 추가/삭제하면 오늘 기준 누적 예상
 * 납부일과 해당 분기(예: 2026년 6월 12일, 2분기)를 즉시 보여준다.
 */
function ExtensionRoundsModal({
  extension,
  initialRounds,
  onApply,
  onClose,
}: {
  extension: CountryExtension;
  initialRounds: number[];
  onApply: (rounds: number[]) => void;
  onClose: () => void;
}) {
  const [rounds, setRounds] = useState<number[]>(initialRounds);
  const previews = useMemo(() => buildRoundPreviews(rounds), [rounds]);
  const isValid = rounds.length > 0 && rounds.every((months) => Number.isInteger(months) && months >= 1 && months <= 240);

  return (
    <Modal ariaLabel={`${extension.label} 연장 기간 변경`} className="extension-rounds-modal" onClose={onClose}>
      <div className="modal-header">
        <div>
          <h2>{extension.label} 연장 기간</h2>
          <p>유지 결정 회차별 연장 기간입니다. 마지막 회차 이후의 유지 결정에는 마지막 값이 반복 적용됩니다.</p>
        </div>
        <button aria-label="연장 기간 변경 닫기" className="modal-close-button" onClick={onClose} type="button">
          ×
        </button>
      </div>
      <div className="extension-round-list">
        {rounds.map((months, index) => (
          <div className="extension-round-row" key={index}>
            <span className="extension-round-ordinal">{index + 1}회차</span>
            <label>
              <input
                aria-label={`${index + 1}회차 연장 개월`}
                max={240}
                min={1}
                onChange={(event) =>
                  setRounds((prev) => prev.map((value, i) => (i === index ? Number(event.target.value) : value)))
                }
                type="number"
                value={months}
              />
              <span>개월</span>
            </label>
            <span className="extension-round-preview">
              {previews[index] ? `예상 납부일 ${previews[index]}` : "—"}
            </span>
            <IconButton
              disabled={rounds.length <= 1}
              icon="delete"
              label={`${index + 1}회차 삭제`}
              onClick={() => setRounds((prev) => prev.filter((_, i) => i !== index))}
              tone="danger"
            />
          </div>
        ))}
      </div>
      <div className="extension-round-toolbar">
        <Button
          disabled={rounds.length >= 12}
          onClick={() => setRounds((prev) => [...prev, prev[prev.length - 1] ?? 12])}
          type="button"
          variant="secondary"
        >
          + 회차 추가
        </Button>
        <span className="table-subtext">예상 납부일은 오늘을 기준으로 회차별 연장을 누적한 값입니다.</span>
      </div>
      <div className="modal-actions">
        <Button onClick={onClose} type="button" variant="secondary">
          취소
        </Button>
        <Button disabled={!isValid} onClick={() => onApply(rounds)} type="button">
          적용
        </Button>
      </div>
    </Modal>
  );
}

// 항목8: 오늘 + 회차 누적 개월 → "YYYY년 M월 D일 (N분기)" 미리보기.
function buildRoundPreviews(rounds: number[]): string[] {
  const previews: string[] = [];
  const cursor = new Date();
  for (const months of rounds) {
    if (!Number.isInteger(months) || months < 1 || months > 240) {
      previews.push("");
      continue;
    }
    cursor.setMonth(cursor.getMonth() + months);
    const quarter = Math.floor(cursor.getMonth() / 3) + 1;
    previews.push(
      `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월 ${cursor.getDate()}일 (${quarter}분기)`,
    );
  }
  return previews;
}

/**
 * @relatedFR FR-LEGAL-24
 * @description 항목10: 납부 예정일 상세 모달 — 적용 규칙·기준일·조정 이력을 보여주고 납부일을 조정한다.
 */
function ScheduleDetailModal({
  item,
  onAdjust,
  onClose,
}: {
  item: AnnualFeeScheduleItem;
  onAdjust: (adjustedDueDate: string, reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [adjustedDueDate, setAdjustedDueDate] = useState(
    item.effectiveAnnualFeeDueDate ?? item.nextAnnualFeeDueDate ?? "",
  );
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const currentDueDate = item.effectiveAnnualFeeDueDate ?? item.nextAnnualFeeDueDate;
  const isDirty = Boolean(adjustedDueDate) && adjustedDueDate !== currentDueDate;

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage("");
    try {
      await onAdjust(adjustedDueDate, reason);
      onClose();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "납부 예정일 조정에 실패했습니다."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal ariaLabel={`${item.managementNumber} 납부 규칙·조정`} className="schedule-detail-modal" onClose={onClose}>
      <div className="modal-header">
        <div>
          <h2>{item.title}</h2>
          <p>{item.managementNumber} · {item.country}</p>
        </div>
        <button aria-label="납부 상세 닫기" className="modal-close-button" onClick={onClose} type="button">
          ×
        </button>
      </div>

      <dl className="schedule-detail-grid">
        <div>
          <dt>적용 규칙</dt>
          <dd>{item.paymentRuleLabel ?? "-"}</dd>
        </div>
        <div>
          <dt>기산일 기준</dt>
          <dd>{item.annualFeeBasis === "REGISTRATION_DATE" ? "등록일" : "출원일"} ({item.annualFeeBaseDate ?? "-"})</dd>
        </div>
        <div>
          <dt>현재 예정일</dt>
          <dd>
            <strong>{currentDueDate ?? "-"}</strong>
            {item.storedAnnualFeeDueDate
              && item.effectiveAnnualFeeDueDate
              && item.storedAnnualFeeDueDate !== item.effectiveAnnualFeeDueDate
              ? ` (저장값 ${item.storedAnnualFeeDueDate} → 재계산)`
              : ""}
          </dd>
        </div>
      </dl>

      {item.adjustmentHistory.length > 0 ? (
        <div className="schedule-detail-history">
          <h3>조정 이력</h3>
          <ul>
            {item.adjustmentHistory.slice(0, 5).map((history) => (
              <li key={history.adjustmentId}>
                <strong>{history.previousDueDate ?? "-"} → {history.adjustedDueDate}</strong>
                <span>
                  {history.reason ?? "사유 미기재"} · {history.adjustedBy ?? "관리자"} · {history.adjustedAt?.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="schedule-detail-adjust">
        <h3>납부 예정일 조정</h3>
        <div className="annual-fee-adjust-form">
          <input
            aria-label="조정할 납부 예정일"
            onChange={(event) => setAdjustedDueDate(event.target.value)}
            type="date"
            value={adjustedDueDate}
          />
          <input
            aria-label="조정 사유"
            onChange={(event) => setReason(event.target.value)}
            placeholder="조정 사유"
            value={reason}
          />
          <Button disabled={isSaving || !isDirty || !reason.trim()} onClick={handleSave} type="button">
            {isSaving ? "저장 중…" : "조정"}
          </Button>
        </div>
        {errorMessage ? <p className="field-error">{errorMessage}</p> : null}
      </div>
    </Modal>
  );
}
