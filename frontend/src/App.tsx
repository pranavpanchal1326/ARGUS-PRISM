import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { AuthProvider, useAuth } from "./shell/AuthContext";
import { Login } from "./screens/Login";
import { Landing } from "./screens/Landing";
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
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
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

