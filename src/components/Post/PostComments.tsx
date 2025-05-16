import {
  Box,
  Typography,
  Stack,
} from "@mui/material";
import type { PostComment } from "../../types/comment";
import CommentForm from "./CommentForm";
import CommentCard from "./CommentCard";

interface PostCommentsProps {
  comments: PostComment[];
  onAddComment: (comment: PostComment) => void;
}

export default function PostComments({ comments, onAddComment }: PostCommentsProps) {
  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={2} sx={{ color: "var(--text-100)" }}>
        댓글 {comments.length}
      </Typography>

      {/* 입력 폼 */}
      <CommentForm onSubmit={onAddComment} />

      {/* 댓글 리스트 */}
      <Stack mt={3} spacing={2}>
        {comments.map((comment) => (
          <CommentCard key={comment.id} comment={comment} />
        ))}
      </Stack>
    </Box>
  );
}