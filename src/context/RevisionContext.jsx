import React, { createContext, useContext, useState, useCallback } from 'react';

const RevisionContext = createContext({
    isRevisionActive: false,
    setRevisionActive: () => {},
    confirmNavigation: () => true
});

export const useRevision = () => useContext(RevisionContext);

export const RevisionProvider = ({ children }) => {
    const [isRevisionActive, setIsRevisionActive] = useState(false);

    const setRevisionActive = useCallback((active) => {
        setIsRevisionActive(active);
    }, []);

    // Returns true if navigation should proceed, false if blocked
    const confirmNavigation = useCallback((message) => {
        if (!isRevisionActive) return true;
        return window.confirm(message);
    }, [isRevisionActive]);

    return (
        <RevisionContext.Provider value={{ isRevisionActive, setRevisionActive, confirmNavigation }}>
            {children}
        </RevisionContext.Provider>
    );
};

export default RevisionContext;
