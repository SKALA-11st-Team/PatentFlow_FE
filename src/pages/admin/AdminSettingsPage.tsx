import { AppLayout } from "../../components/layout/AppLayout";
import { Section } from "../../components/common/Section";

/**
 * @relatedFR FR-014
 * @relatedUI UI-008
 * @description 관리자 운영 기준, 평가 기준, AI 레포트 메일 발송 매핑 정보를 설정하는 화면
 */
export function AdminSettingsPage() {
  return (
    <AppLayout
      role="ADMIN"
      title="설정"
      description="평가 기준, 부서별 수신자 매핑, 운영 기준을 관리합니다."
    >
      <Section title="운영 설정" description="백엔드 연동 전까지 설정 항목의 구조를 먼저 고정합니다.">
        <div className="placeholder-grid">
          <PlaceholderItem title="평가 기준" text="권리성, 기술성, 시장성, 라이프사이클 경제성 기준을 관리합니다. 사업 연계성은 추후 개발 예정입니다." />
          <PlaceholderItem title="AI 레포트 메일 수신자 매핑" text="부서별 수신자와 참조자 정보를 관리합니다." />
          <PlaceholderItem title="검토 운영 기준" text="연차료 검토 기간, 알림 기준, 승인 흐름을 관리합니다." />
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
