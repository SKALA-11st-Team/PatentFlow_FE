import type { AppNotification } from "../types/notification";

/**
 * @relatedFR N/A
 * @relatedUI UI-COM-03
 * @description 관리자와 사업부 공통 헤더 알림 창에 표시할 데모 알림 데이터
 */
export const notifications: AppNotification[] = [
  {
    id: "NTF-COMMON-003",
    targetRole: "COMMON",
    title: "체크리스트 전달 완료",
    message: "사업부 평가 체크리스트가 관리자 검토 화면에 반영되었습니다.",
    createdAt: "2026-05-03T09:30:00+09:00",
    isRead: false,
  },
  {
    id: "NTF-COMMON-001",
    targetRole: "COMMON",
    title: "연차료 검토 일정 안내",
    message: "이번 분기 검토 대상 특허의 사업부 의견 제출 기한이 가까워졌습니다.",
    createdAt: "2026-05-02T09:00:00+09:00",
    isRead: false,
  },
  {
    id: "NTF-ADMIN-001",
    targetRole: "ADMIN",
    title: "메일 발송 대기",
    message: "AI 평가 레포트가 생성된 특허 4건의 사업부 메일 발송이 필요합니다.",
    createdAt: "2026-05-02T10:20:00+09:00",
    isRead: false,
  },
  {
    id: "NTF-BUSINESS-001",
    targetRole: "BUSINESS",
    title: "의견 작성 요청",
    message: "배정된 특허 검토 후 유지/포기 의견을 입력해 주세요.",
    createdAt: "2026-05-02T11:15:00+09:00",
    isRead: false,
  },
  {
    id: "NTF-COMMON-002",
    targetRole: "COMMON",
    title: "검토 이력 저장 완료",
    message: "최근 특허 평가와 판단 이력이 정상적으로 반영되었습니다.",
    createdAt: "2026-05-01T17:30:00+09:00",
    isRead: true,
  },
  {
    id: "NTF-COMMON-004",
    targetRole: "COMMON",
    title: "운영 기준 업데이트",
    message: "연차료 검토 운영 기준 변경 사항이 설정에 반영되었습니다.",
    createdAt: "2026-04-18T13:00:00+09:00",
    isRead: true,
  },
];
