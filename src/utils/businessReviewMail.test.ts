/**
 * @author 유건욱
 * @date 2026-06-11
 */
import { describe, it, expect } from "vitest";
import {
  createBusinessReviewMailDraftFromPatents,
  toBusinessReviewMailSendDraft,
} from "./businessReviewMail";
import type { PatentListItem } from "../types/patent";
import type { PatentPdfLink } from "../types/mailing";

/**
 * @relatedFR FR-LEGAL-13, FR-LEGAL-14
 * @relatedUI UI-LEGAL-05
 * @description 사업부 검토 요청 메일 미리보기·발송 드래프트 생성 유틸의 회귀 테스트.
 */

function patent(patentId: string, overrides: Partial<PatentListItem> = {}): PatentListItem {
  return {
    patentId,
    managementNumber: `M-${patentId}`,
    title: "테스트 특허",
    businessArea: "Data",
    technologyArea: "AI",
    productName: "제품",
    country: "KR",
    coApplicants: "없음",
    applicationDate: "2024-08-28",
    registrationDate: "2026-02-25",
    expectedExpirationDate: "2044-08-28",
    departmentId: "DEPT-A",
    departmentName: "A사업부",
    lifecycleStatus: "ACTIVE",
    reviewWorkflowStatus: "MAIL_READY",
    feeDueDate: "2029-02-25",
    reviewReason: "연차료 납부 검토 시점 도래",
    currentRecommendation: "MAINTAIN",
    businessOpinionDecision: null,
    legalActionResult: null,
    applicationNumber: "10-2024-0115774",
    registrationNumber: "10-2932891",
    originalPatentUrl: "https://patents.google.com/patent/KR102932891/ko",
    inReview: true,
    ...overrides,
  } as PatentListItem;
}

// MAIL-12: KIPRIS_S3 PDF 링크가 있으면 본문에 다운로드 라인이 추가되고 payload에 보존된다.
describe("businessReviewMail — 특허 PDF 다운로드 링크(MAIL-12)", () => {
  const pdfLink: PatentPdfLink = {
    patentId: "PAT-1",
    pdfUrl: "https://bucket.s3.amazonaws.com/patent-pdfs/PAT-1.pdf?X-Amz-Signature=x",
    source: "KIPRIS_S3",
    expiresAt: "2026-06-18T00:00:00+09:00",
  };

  it("KIPRIS_S3 링크가 있는 특허에만 PDF 다운로드 라인을 본문에 추가한다", () => {
    const draft = createBusinessReviewMailDraftFromPatents(
      [patent("PAT-1"), patent("PAT-2")],
      [],
      [pdfLink, { patentId: "PAT-2", pdfUrl: null, source: "ORIGINAL_URL", expiresAt: null }],
    );

    expect(draft.body).toContain("특허 PDF 다운로드: https://bucket.s3.amazonaws.com/patent-pdfs/PAT-1.pdf");
    expect(draft.body).toContain("(7일간 유효)");
    expect(draft.body.match(/특허 PDF 다운로드/g)).toHaveLength(1);
  });

  it("PDF 링크가 없으면 기존 본문(원문 URL 라인)만 유지한다", () => {
    const draft = createBusinessReviewMailDraftFromPatents([patent("PAT-1")], []);

    expect(draft.body).toContain("특허 원문:");
    expect(draft.body).not.toContain("특허 PDF 다운로드");
  });

  // MAIL-13: 법무팀 업로드본(TW·UAE 등)은 presigned가 없으므로 특허 상세 딥링크를 안내한다.
  it("UPLOADED 소스는 시스템 상세 딥링크 안내 라인을 추가한다", () => {
    const draft = createBusinessReviewMailDraftFromPatents(
      [patent("PAT-TW", { country: "TW" })],
      [],
      [{ patentId: "PAT-TW", pdfUrl: null, source: "UPLOADED", expiresAt: null }],
    );

    // 딥링크 URL은 VITE_APP_URL/window.origin 유무에 따라 생략될 수 있어 본문 문구만 검증한다.
    expect(draft.body).toContain("특허 PDF: 시스템 특허 상세에서 다운로드");
    expect(draft.body).not.toContain("7일간 유효");
  });

  it("발송 payload의 patents에 pdfDownloadUrl을 포함한다(없으면 null)", () => {
    const draft = createBusinessReviewMailDraftFromPatents([patent("PAT-1"), patent("PAT-2")], [], [pdfLink]);
    const sendDraft = toBusinessReviewMailSendDraft(draft);

    expect(sendDraft.patents[0].pdfDownloadUrl).toContain("X-Amz-Signature");
    expect(sendDraft.patents[1].pdfDownloadUrl).toBeNull();
  });
});

// FR-LEGAL-23: 회신 기한 안내 문구가 dangling 참조가 되지 않도록 한다.
describe("businessReviewMail — 회신 기한 안내(FR-LEGAL-23)", () => {
  it("회신 기한이 설정되면 기한 라인과 함께 '회신 기한까지' 문구를 명시한다", () => {
    const draft = createBusinessReviewMailDraftFromPatents([patent("PAT-1")], [], [], "2026-07-31");

    expect(draft.body).toContain("회신 기한: 2026-07-31");
    expect(draft.body).toContain("회신 기한까지 사업부 의견을 제출해 주세요.");
  });

  it("회신 기한이 없으면 기한 라인을 생략하고 미명시 기한을 참조하지 않는다", () => {
    const draft = createBusinessReviewMailDraftFromPatents([patent("PAT-1")]);

    expect(draft.body).not.toContain("회신 기한:");
    // 미명시 기한을 가리키는 "회신 기한까지 …" 단독 라인이 남지 않아야 한다.
    expect(draft.body.split("\n")).not.toContain("회신 기한까지 사업부 의견을 제출해 주세요.");
    expect(draft.body).toContain("관리자가 안내한 회신 기한까지 사업부 의견을 제출해 주세요.");
  });
});
