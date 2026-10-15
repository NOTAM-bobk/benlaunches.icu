import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router";
import "./index.css";
import "./stats-submissions.css";
import "./streak.css";
import "./site-supporters.css";
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
import Changelog from "./pages/Changelog.tsx";
import ServiceDetail from "./pages/ServiceDetail.tsx";
import { Privacy, Terms } from "./pages/Legal.tsx";
import EmbedBadge from "./pages/EmbedBadge.tsx";
import Checkout from "./pages/Checkout.tsx";
import CheckoutSuccess from "./pages/CheckoutSuccess.tsx";
import { UserProfile, Users } from "./pages/Users.tsx";
import Stats from "./pages/Stats.tsx";
import NotFound from "./pages/NotFound.tsx";
import { recordVisitToday } from "./lib/visitStreak";
import { applyTheme, readTheme } from "./lib/theme";

/* Opening the site is all the daily streak needs — no account involved. */
recordVisitToday();
/* Repaint before the first render, so a chosen background never flashes. */
applyTheme(readTheme());

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
        path: "services/:id",
        element: <ServiceDetail />,
      },
      {
        path: "checkout",
        element: <Checkout />,
      },
      {
        path: "checkout/success",
        element: <CheckoutSuccess />,
      },
      {
        path: "changelog",
        element: <Changelog />,
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
      {
        path: "stats",
        element: <Stats />,
      },
      /* Anything else keeps the header and the footer and reads as a dead end. */
      {
        path: "*",
        element: <NotFound />,
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
