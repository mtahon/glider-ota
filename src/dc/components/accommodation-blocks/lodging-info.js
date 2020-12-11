import {FaBed} from "react-icons/fa";
import style from "./lodging-info.module.scss"
import React from 'react';
import {format, parseISO} from "date-fns";
import {safeDateFormat} from '../../../utils/offer-utils'

export const LodgingInfo = ({checkInDate, checkOutDate, cityName}) => {
    return (
        <div className={style.adBox}>
            <div className={style.adIcon}><FaBed/></div>
            <div className={style.adDetails}>
                <div className={style.adDate}>
                    {checkInDate && safeDateFormat(checkInDate, 'dd MMM')}
                    {checkInDate && checkInDate && ('-')}
                    {checkOutDate && safeDateFormat(checkOutDate, 'dd MMM')} </div>
                <div className={style.adCityName}>{cityName}</div>
            </div>
        </div>
    )
}
