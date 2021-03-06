import React, {useEffect, useState, useCallback} from 'react'
import style from './hotel-search-results.module.scss'
import _ from 'lodash'
import HotelDetails from "../hoteldetails/hotel-details"

import {HotelSearchResultsFilterHelper} from "../../../utils/hotel-search-results-filter-helper";
import {
    hotelErrorSelector,
    hotelsFiltersSelector, isHotelSearchFormValidSelector,
    isHotelSearchInProgressSelector,
    hotelSearchCriteriaSelector, searchForHotelsAction,
    hotelSearchResultsSelector, requestSearchResultsRestoreFromCache, isShoppingFlowStoreInitialized
} from "../../../redux/sagas/shopping-flow-store";
import {connect} from "react-redux";
import Spinner from "../../components/common/spinner";
import SearchButton from "../search-form/search-button";
import ResultsPaginator, {limitSearchResultsToCurrentPage, ITEMS_PER_PAGE} from "../common/pagination/results-paginator";

export function HotelsSearchResults(props) {
    const {
        searchResults,
        onSearchClicked,
        isSearchFormValid,
        filters,
        searchInProgress,
        isStoreInitialized,
        onRestoreResultsFromCache,
        error,
        initSearch
    } = props;
    const [currentPage, setCurrentPage] = useState(1);

    //SEARCH button was hit - search for hotels
    const onSearchButtonClicked = useCallback(() => {
        if(onSearchClicked) {
            onSearchClicked();
        }else{
            console.warn('onSearchClicked is not defined!')
        }
    }, [onSearchClicked]);

    useEffect(() => {
        if (initSearch) {
            setTimeout(() => onSearchButtonClicked(), 1000);
        }
    }, [initSearch, onSearchButtonClicked]);

    let results=[];
    let totalResultsCount=0;
    if(searchResults) {
        const helper = new HotelSearchResultsFilterHelper(searchResults);
        results = helper.generateSearchResults(filters);
        totalResultsCount = results.length;
        results = limitSearchResultsToCurrentPage(results, currentPage,ITEMS_PER_PAGE);
    }

    //display search results paginator only if there are more than ITEMS_PER_PAGE results
    const displayResultsPaginator = () =>{

        if(totalResultsCount < ITEMS_PER_PAGE)
            return (<></>)
        return (
            <ResultsPaginator activePage={currentPage} recordsPerPage={ITEMS_PER_PAGE} onActivePageChange={setCurrentPage} totalRecords={totalResultsCount}/>
        )
    }


    return (
        <>
            <SearchButton disabled={!isSearchFormValid} onSearchButtonClicked={onSearchButtonClicked}/>
            <Spinner enabled={searchInProgress===true}/>
            {error && (<div>ERROR OCCURED</div>)}

            <div className='pt-3'/>
            {/*<Row className={style.hotelsSearchResultsWrapper}>*/}
                {
                    _.map(results, (result, id) => {
                        let hotel = result.hotel;
                        let bestoffer = result.bestoffer;
                        // return (<SingleHotel hotel={hotel} bestoffer={bestoffer} key={id} handleClick={onHotelSelected} searchResults={searchResults}/>)
                        return (<HotelDetails key={id} searchResults={searchResults} hotel={hotel}/>)
                    })
                }
            {/*</Row>*/}
            {displayResultsPaginator()}
        </>
    )

}



const mapStateToProps = state => ({
    filters: hotelsFiltersSelector(state),
    searchCriteria: hotelSearchCriteriaSelector(state),
    searchInProgress: isHotelSearchInProgressSelector(state),
    searchResults: hotelSearchResultsSelector(state),
    isSearchFormValid: isHotelSearchFormValidSelector(state),
    isStoreInitialized: isShoppingFlowStoreInitialized(state),
    error:hotelErrorSelector(state)
});

const mapDispatchToProps = (dispatch) => {
    return {
        onSearchClicked: () => {
            dispatch(searchForHotelsAction())
        },
        onRestoreResultsFromCache: () => {
            dispatch(requestSearchResultsRestoreFromCache())
        },
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(HotelsSearchResults);
