const EMPTY_POSTS_TITLE = "아직 포스트가 없어요";
const EMPTY_POSTS_DESCRIPTION = "새로운 이야기를 준비하고 있어요.";

export function EmptyState({
  title = EMPTY_POSTS_TITLE,
  description = EMPTY_POSTS_DESCRIPTION,
}: {
  title?: string;
  description?: string;
} = {}) {
  return (
    <div className="py-10 text-center">
      <h2 className="font-semibold">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-secondary">{description}</p>
      )}
    </div>
  );
}
