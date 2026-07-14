import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppShell } from "./shell/AppShell";
import { AuthProvider, useAuth } from "./shell/AuthContext";
import { ModeProvider } from "./shell/ModeContext";
import { Login } from "./screens/Login";
import { Landing } from "./screens/Landing";
import { ExaminationDesk } from "./screens/ExaminationDesk";
import { UnderConstruction } from "./screens/UnderConstruction";
import { NoticeProvider } from "./canon/Notices";

/* Code-split off the golden path (Part 14.3 §10). The desk (04) loads
   eagerly — it is the default landing; everything heavier is lazy. */
const SpecimenBook = lazy(() => import("./screens/SpecimenBook").then((m) => ({ default: m.SpecimenBook })));
const Docket = lazy(() => import("./screens/Docket").then((m) => ({ default: m.Docket })));
const Plate = lazy(() => import("./screens/Plate").then((m) => ({ default: m.Plate })));
const RecruiterDie = lazy(() => import("./screens/RecruiterDie").then((m) => ({ default: m.RecruiterDie })));
const PrintingRoom = lazy(() => import("./screens/PrintingRoom").then((m) => ({ default: m.PrintingRoom })));
const BoundRegister = lazy(() => import("./screens/BoundRegister").then((m) => ({ default: m.BoundRegister })));
const CommandCenter = lazy(() => import("./screens/CommandCenter").then((m) => ({ default: m.CommandCenter })));
const Mint = lazy(() => import("./screens/Mint").then((m) => ({ default: m.Mint })));

function RequireAuth() {
  const { me, loading } = useAuth();
  if (loading) return null;
  if (!me) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/* The press is working — the honest loading language (Part 7.4). */
function Printing() {
  return <div className="void"><p className="void__detail mx">THE PRESS IS WORKING…</p></div>;
}

export default function App() {
  return (
    <AuthProvider>
      <ModeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route element={<NoticeProvider><AppShell /></NoticeProvider>}>
                <Route path="/alerts" element={<ExaminationDesk />} />
                <Route path="/command-center" element={<Suspense fallback={<Printing />}><CommandCenter /></Suspense>} />
                <Route path="/cases" element={<Suspense fallback={<Printing />}><Docket /></Suspense>} />
                <Route path="/accounts" element={<Suspense fallback={<Printing />}><SpecimenBook /></Suspense>} />
                <Route path="/graph" element={<Suspense fallback={<Printing />}><Plate /></Suspense>} />
                <Route path="/recruiters" element={<Suspense fallback={<Printing />}><RecruiterDie /></Suspense>} />
                <Route path="/autostr" element={<UnderConstruction title="AutoSTR" />} />
                <Route path="/autostr/:caseId" element={<Suspense fallback={<Printing />}><PrintingRoom /></Suspense>} />
                <Route path="/compliance" element={<Suspense fallback={<Printing />}><BoundRegister /></Suspense>} />
                <Route path="/admin" element={<Suspense fallback={<Printing />}><Mint /></Suspense>} />
                <Route path="*" element={<Navigate to="/alerts" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ModeProvider>
    </AuthProvider>
  );
}
