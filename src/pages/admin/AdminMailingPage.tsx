import { AppLayout } from "../../components/layout/AppLayout";
import { Section } from "../../components/common/Section";

/**
 * @relatedFR FR-014, FR-015, FR-016
 * @relatedUI UI-LEGAL-06
 * @description 관리자 메일 미리보기, 수신자 매핑, 발송 이력을 관리하는 화면
 */
export function AdminMailingPage() {
  return (
    <AppLayout
      role="ADMIN"
      title="AI 레포트 메일 발송"
      description="사업부 검토 요청 메일의 미리보기, 수신자 매핑, 발송 이력을 관리합니다."
    >
      <Section title="AI 레포트 메일 발송 준비" description="메일 발송 API 연동 전까지 데모용 업무 영역을 표시합니다.">
        <div className="placeholder-grid">
          <PlaceholderItem title="메일 미리보기" text="AI 특허 평가 레포트와 검토 요청 내용을 확인합니다." />
          <PlaceholderItem title="수신자 매핑" text="부서별 담당자, 참조자, 백업 담당자를 관리합니다." />
          <PlaceholderItem title="발송 이력" text="발송 일시, 대상 부서, 처리 상태를 조회합니다." />
        </div>
      </Section>
    </AppLayout>
  );
}

function PlaceholderItem({ title, text }: { title: string; text: string }) {
  return (
    <article className="placeholder-item">
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}
