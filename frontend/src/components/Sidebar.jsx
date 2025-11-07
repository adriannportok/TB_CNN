import logo from "../assets/lungs.png";
import userMedico from "../assets/userdoc.svg";
import userAdministrador from "../assets/usuarioadministrador.svg";
import { ChevronFirst, ChevronLast } from "lucide-react";
import { createContext, useState, useContext, useEffect } from "react";
import { Link } from "react-router-dom";

export const SidebarContext = createContext();

export default function Sidebar({ children, onToggle }) {
  const [expanded, setExpanded] = useState(() => {
    const savedState = localStorage.getItem("sidebarExpanded");
    return savedState ? JSON.parse(savedState) : true;
  });

  useEffect(() => {
    localStorage.setItem("sidebarExpanded", JSON.stringify(expanded));
  }, [expanded]);
  const rol = localStorage.getItem("rol");
  const userIcon = rol === "administrador" ? userAdministrador : userMedico;

  const toggleSidebar = () => {
    setExpanded((curr) => {
      const newValue = !curr;
      onToggle?.(newValue);
      return newValue;
    });
  };

  return (
    <SidebarContext.Provider value={{ expanded }}>
      <aside className="h-screen fixed top-0 left-0 z-50">
        <nav className="h-full flex flex-col bg-white border-r border-gray-200 shadow-sm">
          <div className="p-4 pb-2 flex justify-between items-center">
            <div className="flex items-center overflow-hidden transition-all">
              <img
                src={logo}
                className={`transition-all ${expanded ? "w-12" : "w-0"}`}
                alt="Logo"
              />
              <span
                className={`ml-3 font-bold text-2xl text-teal-600 transition-all ${
                  expanded ? "opacity-100" : "opacity-0 w-0"
                }`}
              >
                TB-CNN
              </span>
            </div>

            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg bg-white hover:bg-teal-100"
            >
              {expanded ? <ChevronFirst /> : <ChevronLast />}
            </button>
          </div>

          <ul className="flex-1 px-3">{children}</ul>

          <div className="border-t border-gray-200 flex p-3">
            <img
              src={userIcon}
              className="w-10 h-10 rounded-md"
              alt="Usuario"
            />
            <div
              className={`flex justify-between items-center overflow-hidden transition-all ${
                expanded ? "w-52 ml-3" : "w-0"
              }`}
            >
              <div className="flex flex-col items-start leading-4">
                <h4 className="font-semibold">
                  {localStorage.getItem("nombres")}{" "}
                  {localStorage.getItem("apellidos")}
                </h4>
                <span>{rol || "Invitado"}</span>
              </div>
            </div>
          </div>
        </nav>
      </aside>
    </SidebarContext.Provider>
  );
}

export function SidebarItem({ icon, text, to, active, alert }) {
  const { expanded } = useContext(SidebarContext);
  return (
    <Link
      to={to}
      className={`relative flex items-center py-2 px-3 my-1 font-medium rounded-md cursor-pointer transition-colors group ${
        active
          ? "bg-gradient-to-tr from-indigo-200 to-indigo-100 text-indigo-800"
          : "hover:bg-teal-100 text-gray-600"
      }`}
    >
      {icon}
      <span
        className={`overflow-hidden transition-all ${
          expanded ? "w-52 ml-3" : "w-0"
        }`}
      >
        {text}
      </span>

      {!expanded && (
        <div
          className={`absolute left-full rounded-md px-2 py-1 ml-6 
              bg-indigo-100 text-indigo-800 text-sm invisible opacity-0 -translate-x-3 
              transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0`}
        >
          {text}
        </div>
      )}
    </Link>
  );
}
