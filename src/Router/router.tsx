// src/Router/router.tsx
import { createBrowserRouter } from "react-router-dom";
import Layout from "../components/common/Layout";
import HomePage from "../pages/HomePage";
import PostDetailPage from "../pages/PostDetailPage";
import NewPostPage from "../pages/NewPostPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true, // == path: ""
        element: <HomePage />,
      },
      {
        path: "post/:id",
        element: <PostDetailPage />,
      },
      {
        path: "post/new",
        element: <NewPostPage />,
      },
    ],
  },
]);
