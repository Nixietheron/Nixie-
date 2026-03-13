import { createBrowserRouter } from "react-router";
import { SplashScreen } from "./screens/splash-screen";
import { FeedScreen } from "./screens/feed-screen";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: SplashScreen,
  },
  {
    path: "/feed",
    Component: FeedScreen,
  },
]);