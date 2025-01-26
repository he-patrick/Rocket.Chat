import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { brainstormEventEmitter } from './brainstorm'; // Adjust the path as necessary

const BrainstormContext = createContext<{ htmlBody: string } | undefined>(undefined);

export const BrainstormProvider = ({ children }: { children: ReactNode }) => {
    const [htmlBody, setHtmlBody] = useState('');

    useEffect(() => {
        // Listen for updates from the slash command handler
        const updateHtmlBody = (newHtmlBody: string) => {
            setHtmlBody(newHtmlBody);
        };

        brainstormEventEmitter.on('updateHtmlBody', updateHtmlBody);

        // Cleanup listener on unmount
        return () => {
            brainstormEventEmitter.off('updateHtmlBody', updateHtmlBody);
        };
    }, []);

    return <BrainstormContext.Provider value={{ htmlBody }}>{children}</BrainstormContext.Provider>;
};

export const useBrainstorm = () => {
    const context = useContext(BrainstormContext);
    if (!context) {
        throw new Error('useBrainstorm must be used within a BrainstormProvider');
    }
    return context;
};
