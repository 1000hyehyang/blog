// src/Router/router.tsx
import { createBrowserRouter } from "react-router-dom";
import Layout from "../components/common/Layout";
import HomePage from "../pages/HomePage";
import PostDetailPage from "../pages/PostDetailPage";
import NewPostPage from "../pages/NewPostPage";
import DraftPostPage from "../pages/DraftPostPage";
import EditPostPage from "../pages/EditPostPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "post/:id", element: <PostDetailPage /> },
      { path: "post/new", element: <NewPostPage /> },
      { path: "post/:id/edit", element: <EditPostPage /> },
      { path: "/drafts", element: <DraftPostPage /> },
    ],
  },
]);
