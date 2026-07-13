import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { AuthProvider, useAuth } from "./shell/AuthContext";
import { Login } from "./screens/Login";
import { AlertQueue } from "./screens/AlertQueue";
import { UnderConstruction } from "./screens/UnderConstruction";

function RequireAuth() {
  const { me, loading } = useAuth();
  if (loading) return null;
  if (!me) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <DeskNotice />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/alerts" replace />} />
              <Route path="/alerts" element={<AlertQueue />} />
              <Route path="/command-center" element={<UnderConstruction title="Command Center" />} />
              <Route path="/cases" element={<UnderConstruction title="Cases" />} />
              <Route path="/accounts" element={<UnderConstruction title="Accounts" />} />
              <Route path="/graph" element={<UnderConstruction title="Network Graph" />} />
              <Route path="/recruiters" element={<UnderConstruction title="Recruiter Map" />} />
              <Route path="/autostr" element={<UnderConstruction title="AutoSTR" />} />
              <Route path="/compliance" element={<UnderConstruction title="Compliance" />} />
              <Route path="/admin" element={<UnderConstruction title="Administration" />} />
              <Route path="*" element={<Navigate to="/alerts" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

/* PRISM requires a wider desk — shown under 1280px (base.css media rule) */
function DeskNotice() {
  return (
    <div className="desk-notice">
      <div className="paper desk-notice__card">
        <p className="v-institution" style={{ fontSize: "var(--text-20)", marginBottom: "var(--s-2)" }}>
          A wider desk is required.
        </p>
        <p style={{ fontSize: "var(--text-13)" }}>
          PRISM is an operations console. Please use a display of at least 1280 pixels.
        </p>
      </div>
    </div>
  );
}
