import {
  AppProviders,
  AuthenticatedApp,
  QuickLoginListener,
} from "./features/app-shell";

export default function App() {
  return (
    <AppProviders>
      <QuickLoginListener />
      <AuthenticatedApp />
    </AppProviders>
  );
}
