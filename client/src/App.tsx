import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import PHDataComponent from './components/PHData';
import AuthPage from './components/AuthPage';

const App: React.FC = () => {
  return (
    <Router>
      <Switch>
        <Route path="/login" component={AuthPage} />
        <Route path="/data-ph" component={PHDataComponent} />
      </Switch>
    </Router>
  );
};

export default App;
