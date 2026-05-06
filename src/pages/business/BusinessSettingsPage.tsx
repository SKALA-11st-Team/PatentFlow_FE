import { AppLayout } from "../../components/layout/AppLayout";
import { Section } from "../../components/common/Section";

/**
 * @relatedFR FR-009, FR-014
 * @relatedUI UI-BUS-06
 * @description 사업부 사용자의 알림, 의견 템플릿, 담당자 정보를 설정하는 화면
 */
export function BusinessSettingsPage() {
  return (
    <AppLayout
      role="BUSINESS"
      title="설정"
      description="내 부서의 알림 수신 방식과 의견 작성 편의 설정을 관리합니다."
    >
      <Section title="사업부 설정" description="관리자 승인 영역과 분리된 사업부 사용자 설정입니다.">
        <div className="placeholder-grid">
          <PlaceholderItem title="알림 설정" text="마감 임박, 추가 정보 요청, 최종 판단 완료 알림을 관리합니다." />
          <PlaceholderItem title="의견 템플릿" text="유지/포기 의견 작성 시 자주 쓰는 검토 관점을 관리합니다." />
          <PlaceholderItem title="담당자 정보" text="주 담당자, 백업 담당자, 참조자 정보를 확인합니다." />
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
