// src/components/common/Navbar/DesktopNav.tsx
import { Stack, Button } from "@mui/material";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore";
import { logoutUser } from "../../../lib/utils/logout";

interface Props {
  onLoginOpen: () => void;
}

export default function DesktopNav({ onLoginOpen }: Props) {
  const { user } = useAuthStore();

  const handleLogout = async () => {
    await logoutUser(); // 서버 + 클라이언트 상태 정리
  };

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      {/* 구독 버튼 */}
      <Button
        variant="contained"
        sx={{
          color: "var(--text-600)",
          backgroundColor: "var(--primary-100)",
          boxShadow: "none",
          fontWeight: 500,
          borderRadius: 2,
          px: 3,
          "&:hover": {
            backgroundColor: "var(--primary-200)",
            boxShadow: "none",
          },
        }}
      >
        구독하기
      </Button>

      {/* 관리자만 글쓰기 가능 */}
      {user?.role === "ADMIN" && (
        <Link to="/post/new">
          <Button variant="outlined" sx={{ fontWeight: 500, borderRadius: 2 }}>
            글쓰기
          </Button>
        </Link>
      )}

      {/* 로그인 / 로그아웃 버튼 */}
      {user ? (
        <Button
          onClick={handleLogout}
          sx={{
            fontWeight: 500,
            borderRadius: 2,
            backgroundColor: "var(--bg-100)",
            color: "var(--text-300)",
            "&:hover": { backgroundColor: "var(--bg-200)" },
          }}
        >
          로그아웃
        </Button>
      ) : (
        <Button
          onClick={onLoginOpen}
          sx={{
            fontWeight: 500,
            borderRadius: 2,
            backgroundColor: "var(--bg-100)",
            color: "var(--text-300)",
            "&:hover": { backgroundColor: "var(--bg-200)" },
          }}
        >
          로그인
        </Button>
      )}
    </Stack>
  );
}
