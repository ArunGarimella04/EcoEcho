import React from 'react';

export const NavigationContext = React.createContext({
  isSidebarVisible: false,
  setSidebarVisible: () => {},
});