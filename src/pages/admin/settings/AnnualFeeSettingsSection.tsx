import { useEffect, useMemo, useState } from "react";
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

/**
 * @relatedFR FR-LEGAL-24
 * @relatedUI UI-LEGAL-07
 * @description SETTINGS-11(항목8~9): 연차료 규칙 — 유지 결정 회차별 연장 기간(최초/반복 분리 + 모달 타임라인),
 * 국가별 연차료 규칙(행 편집 + 섹션 단일 저장)을 하나의 섹션에서 관리한다.
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

  // FR-LEGAL-24: 국가별 보유 특허의 다음 연차료 납부 예정일 조회 + 행별 조정.
  const [scheduleItems, setScheduleItems] = useState<AnnualFeeScheduleItem[]>([]);
  const [scheduleCountry, setScheduleCountry] = useState("ALL");
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [adjustingItem, setAdjustingItem] = useState<AnnualFeeScheduleItem | null>(null);

  useEffect(() => {
    getCountryExtensions().then(setExtensions).catch(() => setExtensions([]));
    getFeeRules().then(setFeeRules).catch(() => setFeeRules([]));
  }, []);

  useEffect(() => {
    getAnnualFeeSchedule(scheduleCountry)
      .then(setScheduleItems)
      .catch(() => setScheduleItems([]));
  }, [scheduleCountry]);

  const scheduleCountryOptions = useMemo(
    () => [{ value: "ALL", label: "전체" }, ...feeRules.map((rule) => ({ value: rule.country, label: rule.countryLabel }))],
    [feeRules],
  );


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

  const editingExtension = extensions.find((extension) => extension.country === editingExtensionCountry) ?? null;

  return (
    <>
      <section className="section">
        <div className="section-header">
          <div>
            <h2>연차료 규칙</h2>
            <p>유지 결정 시 납부일 연장 기간 및 국가별 연차료 납부 규칙을 관리합니다.</p>
          </div>
        </div>

        {/* 서브섹션 1: 유지 결정 시 납부일 연장 기간 */}
        <div className="fee-rules-subsection">
          <div className="section-header section-header-compact">
            <div>
              <h3>유지 결정 시 납부일 연장 기간</h3>
              <p>관리자가 특허를 유지 처리할 때마다 다음 납부 예정일이 연장됩니다. 최초 연장과 이후 반복 연장을 국가별로 설정합니다.</p>
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
                {/* FEE-EXT-01: 균일하던 '최초 연장 기간(1회차)' 컬럼은 정보가치가 없어 제거하고,
                    회차별 연장 기간을 한 컬럼에 모아 국가별 차이를 한눈에 보여준다. 상세 편집은 모달이 담당. */}
                <tr>
                  <th>국가</th>
                  <th>연장 기간 (회차별)</th>
                  <th style={{ width: 48 }} />
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
                          {rounds.map((months, i) => (
                            <span
                              className={`extension-round-chip${i === 0 ? " extension-round-chip-first" : ""}`}
                              key={i}
                            >
                              {i + 1}회차 {months}개월
                            </span>
                          ))}
                          {rounds.length === 1 ? <span className="table-subtext">이후 회차도 동일 적용</span> : null}
                          {isDirty ? <span className="badge badge-warning" style={{ marginLeft: "0.4rem" }}>변경됨</span> : null}
                        </div>
                      </td>
                      <td>
                        <IconButton
                          icon="edit"
                          label={`${extension.label} 연장 기간 변경`}
                          onClick={() => setEditingExtensionCountry(extension.country)}
                        />
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
        </div>

        {/* 서브섹션 2: 국가별 연차료 규칙 */}
        <div className="fee-rules-subsection">
          <div className="section-header section-header-compact">
            <div>
              <h3>국가별 연차료 규칙</h3>
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
                  <th>현재 규칙</th>
                </tr>
              </thead>
              <tbody>
                {feeRules.map((rule) => {
                  const draft = feeRuleDrafts[rule.country] ?? toFeeRuleDraft(rule);
                  const isDirty = dirtyFeeRuleCountries.includes(rule.country);
                  // BE AnnualFeeScheduleService.ruleFor가 고정 유지료 일정(maintenanceMonths)을
                  // 내장한 국가는 기산일·일괄 연차 오버라이드를 무시한다. 편집을 허용하면 저장은
                  // 되지만 응답에서 원복되는 silent no-op이 되므로 입력을 잠근다.
                  // BE가 내려주는 fixedSchedule 플래그를 우선 사용하고, 미지원 응답엔 국가 하드코딩으로 폴백.
                  const isFixedRule = rule.fixedSchedule ?? hasFixedSchedule(rule.country);
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
                          disabled={isFixedRule}
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
                          disabled={isFixedRule}
                          max={10}
                          min={0}
                          onChange={(event) => updateDraft({ initialLumpYears: Number(event.target.value) })}
                          type="number"
                          value={draft.initialLumpYears}
                        />
                      </td>
                      <td className="rule-label-cell">
                        {rule.ruleLabel}
                        {isFixedRule ? (
                          <span className="table-subtext">고정 유지료 일정 — 기산일·일괄 연차 변경 불가</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
                {feeRules.length === 0 ? (
                  <tr><td className="empty-table-cell" colSpan={4}>연차료 규칙을 불러오지 못했습니다.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        {/* 서브섹션 3: 연차료 납부 예정 및 조정 (FR-LEGAL-24) */}
        <div className="fee-rules-subsection">
          <div className="section-header section-header-compact">
            <div>
              <h3>연차료 납부 예정 및 조정</h3>
              <p>국가별 보유 특허의 다음 연차료 납부 예정일을 확인하고, 필요 시 납부일을 조정합니다.</p>
            </div>
            <select aria-label="국가 필터" onChange={(event) => setScheduleCountry(event.target.value)} value={scheduleCountry}>
              {scheduleCountryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {scheduleMessage ? (
            <p className="notice notice-compact" style={{ marginBottom: "0.75rem" }}>{scheduleMessage}</p>
          ) : null}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>관리번호</th>
                  <th>발명의 명칭</th>
                  <th>국가</th>
                  <th>기준 납부일</th>
                  <th>실효 납부일</th>
                  <th>조정 납부일 / 사유</th>
                  <th style={{ width: 48 }} />
                </tr>
              </thead>
              <tbody>
                {scheduleItems.map((item) => (
                  <tr key={item.patentId}>
                    <td><strong className="nowrap-cell">{item.managementNumber}</strong></td>
                    <td>{item.title}</td>
                    <td>{item.country}{item.domesticPatent ? " (국내)" : " (해외)"}</td>
                    <td>{item.calculatedAnnualFeeDueDate ?? item.annualFeeBaseDate ?? "-"}</td>
                    <td>{item.effectiveAnnualFeeDueDate ?? item.nextAnnualFeeDueDate ?? "-"}</td>
                    <td>
                      {item.adjustedAnnualFeeDueDate
                        ? `${item.adjustedAnnualFeeDueDate}${item.latestAdjustmentReason ? ` (${item.latestAdjustmentReason})` : ""}`
                        : "-"}
                    </td>
                    <td>
                      <IconButton
                        icon="edit"
                        label={`${item.managementNumber} 납부일 조정`}
                        onClick={() => setAdjustingItem(item)}
                      />
                    </td>
                  </tr>
                ))}
                {scheduleItems.length === 0 ? (
                  <tr>
                    <td className="empty-table-cell" colSpan={7}>
                      표시할 연차료 일정이 없습니다. (mock 모드에서는 백엔드 연결이 필요합니다.)
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {adjustingItem ? (
        <AdjustAnnualFeeModal
          item={adjustingItem}
          onApplied={(updated) => {
            setScheduleItems((prev) => prev.map((it) => (it.patentId === updated.patentId ? updated : it)));
            setAdjustingItem(null);
            setScheduleMessage(`${updated.managementNumber} 납부일을 조정했습니다.`);
          }}
          onClose={() => setAdjustingItem(null)}
        />
      ) : null}

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

// BE AnnualFeeScheduleService.ruleFor가 고정 유지료 일정을 내장해 기산일·일괄 연차
// 오버라이드를 적용하지 않는 국가. US는 등록일 기준 3.5/7.5/11.5년 유지료 일정으로 고정.
// (BE가 별도 플래그를 노출하지 않아 국가 코드로 식별한다.)
const FIXED_SCHEDULE_COUNTRIES = new Set(["US"]);

function hasFixedSchedule(country: string): boolean {
  return FIXED_SCHEDULE_COUNTRIES.has(country.trim().toUpperCase());
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
 * @description 항목8: 회차별 연장 기간 편집 모달 — 오늘 기준 누적 예상 납부 분기를 가로 타임라인으로
 * 시각화한다. 1회차(최초 연장)와 2회차+ 반복 연장을 구분해 표시한다.
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
  const fullPreviews = useMemo(() => buildRoundPreviewsFull(rounds), [rounds]);
  const isValid = rounds.length > 0 && rounds.every((months) => Number.isInteger(months) && months >= 1 && months <= 240);

  const today = new Date();
  const todayLabel = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
  const validPreviews = fullPreviews.filter((p): p is NonNullable<typeof p> => p !== null);
  const lastFlagPct = validPreviews.length <= 1 ? 50 : 90;
  const lastPreview = validPreviews.length > 0 ? validPreviews[validPreviews.length - 1] : null;

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

      {/* 타임라인 시각화 */}
      <div className="extension-timeline-preview">
        <p className="extension-timeline-note">
          예상 납부일은 오늘({todayLabel})을 기준으로 합니다
        </p>
        <div className="extension-timeline-track">
          {/* 정의된 회차까지 solid 선 */}
          <div className="extension-timeline-line" style={{ right: `${100 - lastFlagPct}%` }} />
          {/* 마지막 회차 이후 dashed 반복 선 */}
          {lastPreview && (
            <div className="extension-timeline-line-repeat" style={{ left: `${lastFlagPct}%` }} />
          )}
          {validPreviews.map((preview, idx) => {
            const total = Math.max(1, validPreviews.length - 1);
            const leftPct = validPreviews.length === 1 ? 50 : 10 + (idx / total) * 80;
            return (
              <div
                className="extension-timeline-flag"
                key={idx}
                style={{ left: `${leftPct}%` }}
                title={preview.text}
              >
                <span className="extension-timeline-flag-marker">▲</span>
                <span className="extension-timeline-flag-label">{preview.quarterLabel}</span>
              </div>
            );
          })}
          {/* 반복 ghost 깃발 */}
          {lastPreview && (
            <div className="extension-timeline-flag extension-timeline-flag-ghost" style={{ left: "97%" }}>
              <span className="extension-timeline-flag-marker">▲</span>
              <span className="extension-timeline-flag-label extension-timeline-repeat-label">
                {lastPreview.quarterLabel} ↻
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="extension-round-list">
        {rounds.map((months, index) => (
          <div className="extension-round-row" key={index}>
            <span className="extension-round-ordinal">
              {index === 0 ? "1회차 (최초)" : `${index + 1}회차`}
            </span>
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

/**
 * @relatedFR FR-LEGAL-24
 * @relatedUI UI-LEGAL-07
 * @description 행별 연차료 납부일 조정 모달 — 조정 납부일과 사유를 입력해 BE에 PATCH한다.
 */
function AdjustAnnualFeeModal({
  item,
  onApplied,
  onClose,
}: {
  item: AnnualFeeScheduleItem;
  onApplied: (updated: AnnualFeeScheduleItem) => void;
  onClose: () => void;
}) {
  const [dueDate, setDueDate] = useState(item.adjustedAnnualFeeDueDate ?? item.effectiveAnnualFeeDueDate ?? "");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleApply() {
    if (!dueDate) {
      setError("조정할 납부일을 입력하세요.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const updated = await adjustAnnualFeeSchedule(item.patentId, dueDate, reason.trim());
      onApplied(updated);
    } catch (caught) {
      setError(getApiErrorMessage(caught, "납부일 조정에 실패했습니다."));
      setIsSaving(false);
    }
  }

  return (
    <Modal ariaLabel={`${item.managementNumber} 연차료 납부일 조정`} className="settings-modal" onClose={onClose}>
      <div className="modal-header">
        <div>
          <h2>연차료 납부일 조정</h2>
          <p>{item.managementNumber} · {item.title}</p>
        </div>
        <button aria-label="납부일 조정 닫기" className="modal-close-button" onClick={onClose} type="button">
          ×
        </button>
      </div>
      <label className="form-field">
        <span className="form-label-text">조정 납부일</span>
        <input onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate ?? ""} />
      </label>
      <label className="form-field">
        <span className="form-label-text">조정 사유</span>
        <textarea
          onChange={(event) => setReason(event.target.value)}
          placeholder="납부일 조정 사유를 입력하세요."
          value={reason}
        />
      </label>
      {error ? <p className="notice notice-error notice-compact">{error}</p> : null}
      <div className="modal-actions">
        <Button onClick={onClose} type="button" variant="secondary">
          취소
        </Button>
        <Button disabled={isSaving} onClick={handleApply} type="button">
          {isSaving ? "저장 중…" : "조정 저장"}
        </Button>
      </div>
    </Modal>
  );
}

// 항목8: 오늘 + 회차 누적 개월 → 분기 레이블(타임라인 깃발) + 전체 날짜 텍스트(tooltip용) 반환.
function buildRoundPreviewsFull(
  rounds: number[],
): ({ text: string; quarterLabel: string } | null)[] {
  const results: ({ text: string; quarterLabel: string } | null)[] = [];
  const cursor = new Date();
  for (const months of rounds) {
    if (!Number.isInteger(months) || months < 1 || months > 240) {
      results.push(null);
      continue;
    }
    cursor.setMonth(cursor.getMonth() + months);
    const yy = String(cursor.getFullYear()).slice(2);
    const quarter = Math.floor(cursor.getMonth() / 3) + 1;
    results.push({
      text: `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월 ${cursor.getDate()}일`,
      quarterLabel: `${yy}년 ${quarter}분기`,
    });
  }
  return results;
}

