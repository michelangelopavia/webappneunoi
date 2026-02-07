import Layout from "./Layout.jsx";

import Amministrazione from "./Amministrazione";

import CheckIn from "./CheckIn";

import Coworking from "./Coworking";

import GestioneCoworking from "./GestioneCoworking";

import Home from "./Home";

import Host from "./Host";

import ImportaDati from "./ImportaDati";

import MieiNEU from "./MieiNEU";

import MieiTask from "./MieiTask";

import Profilo from "./Profilo";

import Riepiloghi from "./Riepiloghi";
import RiepilogoSoci from "./RiepilogoSoci";

import TurniHost from "./TurniHost";

import Volontariato from "./Volontariato";

import Welcome from "./Welcome";
import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import VerifyEmail from "./VerifyEmail";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {

    Amministrazione: Amministrazione,

    CheckIn: CheckIn,

    Coworking: Coworking,

    GestioneCoworking: GestioneCoworking,

    Home: Home,

    Host: Host,

    ImportaDati: ImportaDati,

    MieiNEU: MieiNEU,

    MieiTask: MieiTask,

    Profilo: Profilo,

    Riepiloghi: Riepiloghi,
    RiepilogoSoci: RiepilogoSoci,

    TurniHost: TurniHost,

    Volontariato: Volontariato,

    Welcome: Welcome,
    Login: Login,
    Register: Register,
    ForgotPassword: ForgotPassword,
    ResetPassword: ResetPassword,
    VerifyEmail: VerifyEmail,

}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    return (
        <Layout currentPageName={currentPage}>
            <Routes>

                <Route path="/" element={<Home />} />


                <Route path="/Amministrazione" element={<Amministrazione />} />

                <Route path="/CheckIn" element={<CheckIn />} />

                <Route path="/Coworking" element={<Coworking />} />

                <Route path="/GestioneCoworking" element={<GestioneCoworking />} />

                <Route path="/Home" element={<Home />} />

                <Route path="/Host" element={<Host />} />

                <Route path="/ImportaDati" element={<ImportaDati />} />

                <Route path="/MieiNEU" element={<MieiNEU />} />

                <Route path="/MieiTask" element={<MieiTask />} />

                <Route path="/Profilo" element={<Profilo />} />

                <Route path="/Riepiloghi" element={<Riepiloghi />} />
                <Route path="/RiepilogoSoci" element={<RiepilogoSoci />} />

                <Route path="/TurniHost" element={<TurniHost />} />

                <Route path="/Volontariato" element={<Volontariato />} />

                <Route path="/Welcome" element={<Welcome />} />
                <Route path="/Login" element={<Login />} />
                <Route path="/Register" element={<Register />} />
                <Route path="/ForgotPassword" element={<ForgotPassword />} />
                <Route path="/ResetPassword" element={<ResetPassword />} />
                <Route path="/VerifyEmail" element={<VerifyEmail />} />

            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
