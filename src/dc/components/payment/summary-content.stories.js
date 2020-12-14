import React from 'react';
import SummaryContent from "./summary-content";
import dummySearchResults from "../../data/sample_response_flights.json"
import {
    action
} from '@storybook/addon-actions';

export default {
    component: SummaryContent,
    title: 'DC/pages/price summary',
    excludeStories: /.*Data$/,
};

let selectedOfferId = Object.keys(dummySearchResults.offers)[0] //take first offer

export const defaultPage = () => {
    return (<SummaryContent searchResults={dummySearchResults} offerId={selectedOfferId}/>);
}