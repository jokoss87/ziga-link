/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).\
 */
import Activities from './pages/Activities';
import Admin from './pages/Admin';
import AdminObedience from './pages/AdminObedience';
import AnnouncementDetail from './pages/AnnouncementDetail';
import Badges from './pages/Badges';
import Balade from './pages/Balade';
import CGU from './pages/CGU';
import Carnet from './pages/Carnet';
import CarteFullscreen from './pages/CarteFullscreen';
import Chat from './pages/Chat';
import CreateAnnouncement from './pages/CreateAnnouncement';
import EditAnnouncement from './pages/EditAnnouncement';
import Feedback from './pages/Feedback';
import Friends from './pages/Friends';
import GroupChat from './pages/GroupChat';
import Home from './pages/Home';
import Matching from './pages/Matching';
import Messages from './pages/Messages';
import MyDogs from './pages/MyDogs';
import Obeissance from './pages/Obeissance';
import Profil from './pages/Profil';
import Regles from './pages/Regles';
import Social from './pages/Social';
import SportsCanins from './pages/SportsCanins';
import TrouverEducateur from './pages/TrouverEducateur';
import ActivitesSport from './pages/ActivitesSport';
import ActivitesDressage from './pages/ActivitesDressage';
import JournalVie from './pages/JournalVie';
import SupportPage from './pages/SupportPage';
import EncounterRatingPage from './pages/EncounterRatingPage';
import BugDetail from './pages/BugDetail';
import PublicProfile from './pages/PublicProfile';
import PolitiqueConfidentialite from './pages/PolitiqueConfidentialite';
import MentionsLegales from './pages/MentionsLegales';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Activities": Activities,
    "Admin": Admin,
    "AdminObedience": AdminObedience,
    "AnnouncementDetail": AnnouncementDetail,
    "Badges": Badges,
    "Balade": Balade,
    "CGU": CGU,
    "Carnet": Carnet,
    "CarteFullscreen": CarteFullscreen,
    "Chat": Chat,
    "CreateAnnouncement": CreateAnnouncement,
    "EditAnnouncement": EditAnnouncement,
    "Feedback": Feedback,
    "Friends": Friends,
    "GroupChat": GroupChat,
    "Home": Home,
    "Matching": Matching,
    "Messages": Messages,
    "MyDogs": MyDogs,
    "Obeissance": Obeissance,
    "Profil": Profil,
    "Regles": Regles,
    "Social": Social,
    "SportsCanins": SportsCanins,
    "TrouverEducateur": TrouverEducateur,
    "ActivitesSport": ActivitesSport,
    "ActivitesDressage": ActivitesDressage,
    "JournalVie": JournalVie,
    "SupportPage": SupportPage,
    "EncounterRatingPage": EncounterRatingPage,
    "BugDetail": BugDetail,
    "PublicProfile": PublicProfile,
    "PolitiqueConfidentialite": PolitiqueConfidentialite,
    "MentionsLegales": MentionsLegales,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};