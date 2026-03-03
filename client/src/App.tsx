import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import PostList from "./pages/PostList";
import Editor from "./pages/Editor";
import PostView from "./pages/PostView";
import PreviewPlayground from "./pages/PreviewPlayground";

function Router() {
  const [location] = useLocation();
  const normalizedLocation =
    location.length > 1 ? location.replace(/\/+$/, "") || "/" : location;

  if (
    normalizedLocation === "/preview" ||
    normalizedLocation.startsWith("/preview/")
  ) {
    return <PreviewPlayground />;
  }

  return (
    <Switch location={normalizedLocation}>
      <Route path={"/"} component={PostList} />
      <Route path={"/editor"} component={Editor} />
      <Route path={"/editor/:id"} component={Editor} />
      <Route path={"/post/:slug"} component={PostView} />
      <Route path={"/preview"} component={PreviewPlayground} />
      <Route path={"/preview/"} component={PreviewPlayground} />
      <Route path={"/preview/:token"} component={PreviewPlayground} />
      <Route path={"/preview/:token/"} component={PreviewPlayground} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
