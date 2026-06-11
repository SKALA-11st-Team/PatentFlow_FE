import { describe, it, expect } from "vitest";
import {
  createBusinessReviewMailDraftFromPatents,
  toBusinessReviewMailSendDraft,
} from "./businessReviewMail";
import type { PatentListItem } from "../types/patent";
import type { PatentPdfLink } from "../types/mailing";

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

  it("발송 payload의 patents에 pdfDownloadUrl을 포함한다(없으면 null)", () => {
    const draft = createBusinessReviewMailDraftFromPatents([patent("PAT-1"), patent("PAT-2")], [], [pdfLink]);
    const sendDraft = toBusinessReviewMailSendDraft(draft);

    expect(sendDraft.patents[0].pdfDownloadUrl).toContain("X-Amz-Signature");
    expect(sendDraft.patents[1].pdfDownloadUrl).toBeNull();
  });
});
