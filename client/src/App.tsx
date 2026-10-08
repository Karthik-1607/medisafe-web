import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import LandingPage from "@/pages/LandingPage";
import JourneyPage from "@/pages/JourneyPage";
import LoginPage from "@/pages/LoginPage";
import SupportPage from "@/pages/SupportPage";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { GlobalBackgroundVideo } from "./components/GlobalBackgroundVideo";

function MentalHealthRoute() {
  return <JourneyPage kind="mental" />;
}

function RecoveryRoute() {
  return <JourneyPage kind="recovery" />;
}

function HelpRoute() {
  return <SupportPage />;
}

function EmergencyRoute() {
  return <SupportPage emergency />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/portal" component={Home} />
      <Route path="/mental-health" component={MentalHealthRoute} />
      <Route path="/recovery" component={RecoveryRoute} />
      <Route path="/help" component={HelpRoute} />
      <Route path="/emergency" component={EmergencyRoute} />
      <Route path="/login" component={LoginPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <GlobalBackgroundVideo />
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
