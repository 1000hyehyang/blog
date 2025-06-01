// src/components/common/Navbar/MobileNav.tsx
import { Box, Stack, Button } from "@mui/material";
import { Link } from "react-router-dom";
import { useState } from "react";
import SubscribeModal from "../SubscribeModal";
import { useAuthStore } from "../../../store/useAuthStore";
import { logoutUser } from "../../../lib/utils/logout";

interface Props {
  onLoginOpen: () => void;
}

export default function MobileNav({ onLoginOpen }: Props) {
  const { user } = useAuthStore();
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
  };

  return (
    <Box px={3} py={4} bgcolor="var(--bg-100)">
      <Stack spacing={2}>
        {/* 구독하기 버튼 */}
        <Button
          onClick={() => setSubscribeOpen(true)}
          fullWidth
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

        <SubscribeModal
          open={subscribeOpen}
          onClose={() => setSubscribeOpen(false)}
        />

        {/* 관리자 전용 글쓰기 */}
        {user?.role === "ADMIN" && (
          <>
            <Link to="/post/new">
              <Button
                fullWidth
                variant="outlined"
                sx={{ fontWeight: 500, borderRadius: 2 }}
              >
                글쓰기
              </Button>
            </Link>

            <Link to="/drafts">
              <Button
                fullWidth
                variant="outlined"
                sx={{
                  fontWeight: 500,
                  borderRadius: 2,
                  color: "var(--text-300)",
                  borderColor: "var(--bg-300)",
                  "&:hover": {
                    borderColor: "var(--primary-100)",
                    color: "var(--primary-100)",
                  },
                }}
              >
                임시저장함
              </Button>
            </Link>
          </>
        )}

        {/* 로그인/로그아웃 */}
        {user ? (
          <Button
            onClick={handleLogout}
            fullWidth
            sx={{
              backgroundColor: "var(--bg-100)",
              color: "var(--text-300)",
              fontWeight: 500,
              borderRadius: 2,
            }}
          >
            로그아웃
          </Button>
        ) : (
          <Button
            onClick={onLoginOpen}
            fullWidth
            sx={{
              backgroundColor: "var(--bg-100)",
              color: "var(--text-300)",
              fontWeight: 500,
              borderRadius: 2,
            }}
          >
            로그인
          </Button>
        )}
      </Stack>
    </Box>
  );
}
