import {Col, Container, Row} from "react-bootstrap";
import React, {useState} from 'react';
import OfferUtils from "../../utils/offer-utils";
import style from "./flight-rates.module.scss"
import {ItineraryDetails} from "./trip-details";

export default function TripRates({selectedCombination, selectedOffer, pricePlans, onOfferChange}) {
    const [selection, setSelection] = useState(initializeState(selectedOffer.flightCombination))
        let plansManager = new PricePlansManager(selectedCombination.offers, pricePlans);

    function initializeState(flightCombination){
        let state={}
        flightCombination.map(rec=>{
            return state[rec.flight]=rec.pricePlan;
        })
        console.log("Intialize:",state)
        return state;
    }

    function handlePricePlanSelection(itinId, pricePlanId) {
        console.log("Price plan selected, itinID:", itinId, ", price plan:", pricePlanId)
        let state=Object.assign({},selection);
        state[itinId]=pricePlanId;
        let newOffer = plansManager.findOffer(selection)
        if(newOffer!==undefined){
            console.log("Found new offer")
            onOfferChange(newOffer);
        }
        else {
            console.log("Offer not found")
        }
        setSelection(state)
    }
        const itineraries = selectedCombination.itinerary;
        return (
            <>
            <div>
                <h2 className={style.ratesHeader}>Airline rates</h2>
            </div>
            <div>
                {
                    itineraries.map(itinerary=>{
                        let itinId=itinerary.itinId;
                        return (
                            <ItineraryRates key={itinId} itinerary={itinerary} plansManager={plansManager}
                                                   onPricePlanSelected={handlePricePlanSelection}
                                                   selectedPlanId={selection[itinId]}/>)

                    })
                }

            </div>
            </>
        )
}

/**
 * Render price plans of an itinerary
 */

function ItineraryRates({itinerary, plansManager, onPricePlanSelected,selectedPlanId}) {
    const [selectedPricePlanId,setSelectedPricePlanId] = useState(selectedPlanId);
    let firstSegment=itinerary.segments[0];
    let tripOrigin = firstSegment.origin;
    let lastSegment = itinerary.segments[itinerary.segments.length - 1];
    let tripDestination = lastSegment.destination;

    let itineraryId = itinerary.itinId;
    let availablePricePlans = plansManager.getItineraryUniquePricePlans(itinerary.itinId);

    let allPricePlans = plansManager.getAllPricePlans();

    function selectPlan(itineraryId,pricePlanId){
        // console.log("selectPlan, itineraryId:",itineraryId,", pricePlanId:",pricePlanId);
        onPricePlanSelected(itineraryId,pricePlanId)
    }
    // console.log("itinerary.itinId",itinerary.itinId)
    // console.log("Available price plans for itinerary:",availablePricePlans)
    // console.log("All price plans for itinerary:",allPricePlans)
    return (<>
        {/*<div className={style.ratesItinRoute}>Flight {tripOrigin.city_name?tripOrigin.city_name:tripOrigin.iataCode} —> {tripDestination.city_name?tripDestination.city_name:tripDestination.iataCode}</div>*/}
        <ItineraryDetails itinerary={itinerary}/>
        <div className='py-5'/>
        <div className={style.ratesHeader}>Select a fare below</div>
        <div className='d-flex flex-row flex-wrap'>
                {
                    availablePricePlans.map((pricePlanId) => {
                        // console.log("itineraryId:", itineraryId,",render price plan ID:",pricePlanId,"selectedPlanId:",selectedPlanId, "selectedPricePlanId:",selectedPricePlanId)
                        let pricePlan = allPricePlans[pricePlanId];
                        console.log("Price plan",pricePlan)
                        return (
                            <FareFamilyBenefits amenities={pricePlan.amenities} price={123} familyName={pricePlan.name} isSelected={pricePlanId === selectedPlanId} onClick={() => { selectPlan(itineraryId, pricePlanId)}}/>
                        )

                    })
                }
        </div>
    </>)
}



const Amenity = ({text,type, isSelected})=>{
    let className = 'amenityicon';
    if(isSelected)
        className+= ' amenityActive';
    else
        className+= ' amenityInactive';
    if(type)
        className+=' gicon-'+type;
    return (<>
        <div className='ratesPlanDetails'><i className={className}/>{text}</div>
    </>)
}

/**
 * Render single fare family with it's benefits list and price
 * @param familyName
 * @param price
 * @param isSelected
 * @param amenities
 * @param onClick
 * @returns {*}
 * @constructor
 */
export function FareFamilyBenefits({familyName, price, isSelected, amenities=[], onClick}) {
    let styleName = style.priceplanContainer;
    if(isSelected)
        styleName = style.priceplanContainerSelected;
    return (
        <div className={styleName} onClick={onClick}>
            <div className={style.ratesPlanName}>{familyName}</div>
            <div className={style.ratesPlanPrice}>{price}</div>
            {
                amenities.map((record) =><Amenity text={record} type={record.type} isSelected={isSelected}/>)
            }
        </div>
    )
}


class PricePlansManager {
    constructor(offers, allPricePlans) {
        console.log("PricePlansManager constructor")
        console.log("PricePlansManager allPricePlans:",allPricePlans)
        this.pricePlanCombinations = undefined;
        this.cheapestOffer = undefined;
        this.selectedOfferId = undefined;
        this.allPricePlans = allPricePlans;
        this.selectedItinPlan = [];
        this.offers = offers;
        this.initialize(offers);
    }


    /**
     * find all possible price plans combinations for selected flights
     */
    initialize() {
        let itinPricePlans = this.offers.map(offer => {
            //for each offer, index: offerID, price and flights with associated price plans
            return {
                offerId: offer.offerId,
                flightCombination: offer.flightCombination,
                price: offer.offer.price
            }
        })
        itinPricePlans.sort((a, b) => {
            return a.price.public > b.price.public ? 1 : -1
        })
        this.cheapestOffer = itinPricePlans[0];
        const cheapestPrice = this.cheapestOffer.price.public;
        itinPricePlans.map(r => {
            r.upsellPrice = r.price.public - cheapestPrice;
            return true;
        })

        this.pricePlanCombinations = itinPricePlans;
    }


    getItineraryUniquePricePlans(itineraryId) {
        let results = []
        this.pricePlanCombinations.map(rec => {
            rec.flightCombination.map(f => {
                if (f.flight === itineraryId) {
                    if (results.indexOf(f.pricePlan) < 0)
                        results.push(f.pricePlan)
                }
            })
            return true;
        })
        return results;
    }



    getAllPricePlans() {
        return this.allPricePlans;
    }

    findOffer(itinPlans) {
        // console.log("Available offers:",this.pricePlanCombinations);
        // console.log("Selection state:",itinPlans);

        let found = this.pricePlanCombinations.find(rec=>{
            let flightCombination=rec.flightCombination;
            let allKeysMatch=true;
            flightCombination.map(combination=>{
                allKeysMatch = (allKeysMatch && (itinPlans[combination.flight]===combination.pricePlan))
            })
            return allKeysMatch;
        })
        console.log("Found:",found)
        if(found!==undefined)
            found = this.findOfferById(found.offerId);
        return found;
    }
    findOfferById(offerId){
        return this.offers.find(offer=>offer.offerId === offerId);
    }

}



function getFirstSegment (segments) {
    return segments[0];
}

function  getLastSegment (segments) {
    return ;
}