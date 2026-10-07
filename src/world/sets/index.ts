import type { LocationId } from '../../script/types';
import type { StageSet } from './common';
import { buildMaclarens } from './maclarens';
import { buildApartment } from './apartment';
import { buildBarneys } from './barneys';
import { buildFuture } from './future';
import { buildRooftop } from './rooftop';
import { buildBarneysOffice } from './barneysOffice';
import { buildOffice } from './office';
import { buildLimo } from './limo';
import { buildTaxi } from './taxi';
import { buildCar } from './car';
import { buildMetroNewsOne } from './metroNewsOne';
import { buildStore } from './store';
import { buildRestaurant } from './restaurant';
import { buildLectureHall } from './lectureHall';
import { buildSubway } from './subway';
import { buildLaserTag } from './laserTag';
import { buildWesleyanDorm } from './wesleyanDorm';
import { buildHospital } from './hospital';
import { buildElevator } from './elevator';
import { buildCanadianMall } from './canadianMall';
import { buildMaclarensSidewalk } from './maclarensSidewalk';
import { buildHoserHut } from './hoserHut';
import { buildCourtroom } from './courtroom';
import { buildAtlanticCityCasino } from './atlanticCityCasino';
import { buildLustyLeopard } from './lustyLeopard';

/** Every location's set, built once: the story's locations plus Ted's 2030 living room. */
export function buildSets(): Record<LocationId, StageSet> {
  return {
    maclarens: buildMaclarens(), apartment: buildApartment(), barneys: buildBarneys(), rooftop: buildRooftop(),
    barneys_office: buildBarneysOffice(), office: buildOffice(), car: buildCar(), limo: buildLimo(), taxi: buildTaxi(), future: buildFuture(),
    metro_news_one: buildMetroNewsOne(), store: buildStore(), restaurant: buildRestaurant(), lecture_hall: buildLectureHall(),
    subway: buildSubway(), laser_tag: buildLaserTag(), wesleyan_dorm: buildWesleyanDorm(),
    hospital: buildHospital(), elevator: buildElevator(), canadian_mall: buildCanadianMall(),
    maclarens_sidewalk: buildMaclarensSidewalk(), hoser_hut: buildHoserHut(), courtroom: buildCourtroom(),
    atlantic_city_casino: buildAtlanticCityCasino(), lusty_leopard: buildLustyLeopard(),
  };
}
