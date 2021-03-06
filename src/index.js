import React from 'react'
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Redirect
} from "react-router-dom";

import { Provider } from 'react-redux';
import  store from './redux/store';

import ReactDOM from 'react-dom'
import './styles/glider.scss'
import { CookiesProvider } from 'react-cookie';
import DCLandingPage from './dc/pages/landing-page'
import DCFlightPassengersPage from './dc/pages/pax-details-page'
import DCAncillariesPage from './dc/pages/ancillaries-page'
import DCSeatSelectionPage from './dc/pages/seat-selection-page'
import DCPaymentSummaryPage from './dc/pages/payment-summary-page'
import ConfirmationPage from './dc/pages/confirmation-page'

function Dispatcher() {
    return (
        <Provider store={store}>
            <CookiesProvider>
                <Router>
                    <Switch>
                        <Route path="/dc/pax/" component={DCFlightPassengersPage}/>
                        <Route path="/dc/ancillaries/" component={DCAncillariesPage}/>
                        <Route path="/dc/seatmap/" component={DCSeatSelectionPage}/>
                        <Route path="/dc/summary/" component={DCPaymentSummaryPage}/>
                        <Route path="/dc/confirmation/:confirmedOfferId" component={ConfirmationPage}/>
                        <Route path="/dc/flights" component={DCLandingPage}/>
                        <Route path="/dc/hotels" component={DCLandingPage}/>
                        <Redirect push from="/dc/" to="/dc/flights" />
                        <Redirect push from="/" to="/dc/flights" />
                    </Switch>
                </Router>
            </CookiesProvider>
        </Provider>
    );
}

ReactDOM.render(<Dispatcher/>, document.getElementById('root'));
