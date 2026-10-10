import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router";
import "./index.css";
import { AppShell } from "./components/AppShell.tsx";
import Home from "./pages/Home.tsx";
import Blog from "./pages/Blog.tsx";
import BlogPost from "./pages/BlogPost.tsx";
import Collections from "./pages/Collections.tsx";
import CollectionDetail from "./pages/CollectionDetail.tsx";
import Trending from "./pages/Trending.tsx";
import Submit from "./pages/Submit.tsx";
import Admin from "./pages/Admin.tsx";
import Auth from "./pages/Auth.tsx";
import DiscoverWebsites from "./pages/DiscoverWebsites.tsx";
import NewWebsites from "./pages/NewWebsites.tsx";
import SiteDetail from "./pages/SiteDetail.tsx";
import ThisOrThat from "./pages/ThisOrThat.tsx";
import SiteTinder from "./pages/SiteTinder.tsx";
import { Profile, Saved, Settings } from "./pages/Account.tsx";
import Advertise from "./pages/Advertise.tsx";
import { Privacy, Terms } from "./pages/Legal.tsx";
import EmbedBadge from "./pages/EmbedBadge.tsx";
import { UserProfile, Users } from "./pages/Users.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "blog",
        element: <Blog />,
      },
      {
        path: "blog/:slug",
        element: <BlogPost />,
      },
      {
        path: "collections",
        element: <Collections />,
      },
      {
        path: "collections/:id",
        element: <CollectionDetail />,
      },
      {
        path: "trending",
        element: <Trending />,
      },
      {
        path: "submit",
        element: <Submit />,
      },
      {
        path: "advertise",
        element: <Advertise />,
      },
      {
        path: "terms",
        element: <Terms />,
      },
      {
        path: "privacy",
        element: <Privacy />,
      },
      {
        path: "discover-websites",
        element: <DiscoverWebsites />,
      },
      {
        path: "new-websites",
        element: <NewWebsites />,
      },
      {
        path: "sites/:slug",
        element: <SiteDetail />,
      },
      {
        path: "this-or-that",
        element: <ThisOrThat />,
      },
      {
        path: "site-tinder",
        element: <SiteTinder />,
      },
      {
        path: "admin",
        element: <Admin />,
      },
      {
        path: "auth",
        element: <Auth />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "saved",
        element: <Saved />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "users",
        element: <Users />,
      },
      {
        path: "users/:id",
        element: <UserProfile />,
      },
    ],
  },
  {
    path: "/embed",
    element: <EmbedBadge />,
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
