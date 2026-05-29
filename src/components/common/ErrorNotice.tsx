interface ErrorNoticeProps {
  message: string;
}

/**
 * @relatedFR N/A
 * @relatedUI COMMON
 * @description 서버/API 오류를 사용자 화면에 일관되게 노출한다.
 */
export function ErrorNotice({ message }: ErrorNoticeProps) {
  if (!message) {
    return null;
  }

  return (
    <p className="notice notice-compact notice-error" role="alert">
      {message}
    </p>
  );
}
