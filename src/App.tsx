import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { AppLayout } from "./components/AppLayout";
import { AchievementsPage } from "./pages/AchievementsPage";
import { AboutPage } from "./pages/AboutPage";
import { BoosterPage } from "./pages/BoosterPage";
import { HomePage } from "./pages/HomePage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { LegendexPage } from "./pages/LegendexPage";
import { LoginPage } from "./pages/LoginPage";
import { OpeningRecapPage } from "./pages/OpeningRecapPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { PatchNotesPage } from "./pages/PatchNotesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ShopPage } from "./pages/ShopPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) {
    return <p className="text-sm text-slate-400">Initialisation session...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Booster opening – standalone fullscreen, no AppLayout */}
      <Route
        path="/booster-opening"
        element={
          <RequireAuth>
            <BoosterPage />
          </RequireAuth>
        }
      />

      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/patch-notes" element={<PatchNotesPage />} />
        <Route
          path="/shop"
          element={
            <RequireAuth>
              <ShopPage />
            </RequireAuth>
          }
        />
        <Route
          path="/collection"
          element={
            <RequireAuth>
              <Navigate to="/legendex" replace />
            </RequireAuth>
          }
        />
        <Route path="/series/:slug" element={<Navigate to="/shop" replace />} />
        <Route
          path="/booster/:series"
          element={<Navigate to="/shop" replace />}
        />
        <Route
          path="/leaderboard"
          element={
            <RequireAuth>
              <LeaderboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/opening/:openingId"
          element={
            <RequireAuth>
              <OpeningRecapPage />
            </RequireAuth>
          }
        />
        <Route
          path="/legendex"
          element={
            <RequireAuth>
              <LegendexPage />
            </RequireAuth>
          }
        />
        <Route
          path="/achievements"
          element={
            <RequireAuth>
              <AchievementsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
