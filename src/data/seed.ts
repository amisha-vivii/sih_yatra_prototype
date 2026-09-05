import type {
  ComplaintRecord,
  IncidentRecord,
  LocationRecord,
  PriceBenchmarkRecord,
  ReviewRecord,
  ServiceRecord,
  ServiceReportRecord,
  ServiceType } from
'../types';

/**
 * Seeded reference dataset. Every business name here is fictional and every
 * review / complaint / incident is synthetic, authored for this dataset. No
 * real operator is described. In the FastAPI deployment this file is the
 * `database/seed.sql` payload.
 */

export const locations: LocationRecord[] = [
{ id: 1, city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, location_risk_index: 0.62, peak_months: [10, 11, 12, 1, 2] },
{ id: 2, city: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081, location_risk_index: 0.58, peak_months: [10, 11, 12, 1, 2, 3] },
{ id: 3, city: 'Goa', state: 'Goa', lat: 15.2993, lng: 74.124, location_risk_index: 0.54, peak_months: [11, 12, 1] },
{ id: 4, city: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, location_risk_index: 0.41, peak_months: [10, 11, 2, 3] },
{ id: 5, city: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, location_risk_index: 0.47, peak_months: [10, 11, 2, 3] },
{ id: 6, city: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125, location_risk_index: 0.29, peak_months: [9, 10, 11, 12, 1, 2] },
{ id: 7, city: 'Manali', state: 'Himachal Pradesh', lat: 32.2396, lng: 77.1887, location_risk_index: 0.38, peak_months: [5, 6, 12, 1] },
{ id: 8, city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777, location_risk_index: 0.33, peak_months: [11, 12, 1, 2] }];


/** base nightly / per-trip benchmark by service type, before city multiplier */
const BASE_PRICE: Record<ServiceType, {price: number;unit: string;}> = {
  Hotel: { price: 4200, unit: 'per night' },
  'Travel Agency': { price: 12500, unit: 'per package' },
  'Tour Operator': { price: 8600, unit: 'per tour' },
  Guide: { price: 1600, unit: 'per day' },
  'Taxi / Local Transport': { price: 1900, unit: 'per day' },
  'Activity / Local Service': { price: 2400, unit: 'per activity' }
};

const CITY_MULTIPLIER: Record<number, number> = {
  1: 1.0, 2: 0.95, 3: 1.18, 4: 0.82, 5: 1.12, 6: 1.08, 7: 0.9, 8: 1.25
};

export const priceBenchmarks: PriceBenchmarkRecord[] = (() => {
  const rows: PriceBenchmarkRecord[] = [];
  let id = 1;
  locations.forEach((loc) => {
    (Object.keys(BASE_PRICE) as ServiceType[]).forEach((type) => {
      const base = BASE_PRICE[type];
      const benchmark = Math.round(base.price * CITY_MULTIPLIER[loc.id] / 50) * 50;
      rows.push({
        id: id++,
        location_id: loc.id,
        service_type: type,
        benchmark_price: benchmark,
        p90_price: Math.round(benchmark * 1.45 / 50) * 50,
        currency: 'INR',
        unit: base.unit
      });
    });
  });
  return rows;
})();

export const services: ServiceRecord[] = [
{ id: 1, name: 'Royal Heritage Stay', service_type: 'Hotel', location_id: 1, lat: 26.9239, lng: 75.8267, address: 'Amer Road, Jaipur', registered: true, years_active: 9, created_at: '2016-04-11' },
{ id: 2, name: 'Pink City Tours', service_type: 'Tour Operator', location_id: 1, lat: 26.9196, lng: 75.8118, address: 'Hawa Mahal Road, Jaipur', registered: true, years_active: 6, created_at: '2019-01-20' },
{ id: 3, name: 'Amber Gate Guesthouse', service_type: 'Hotel', location_id: 1, lat: 26.985, lng: 75.8513, address: 'Delhi Road, Jaipur', registered: false, years_active: 2, created_at: '2023-06-02' },
{ id: 4, name: 'Rajputana Cab Collective', service_type: 'Taxi / Local Transport', location_id: 1, lat: 26.9045, lng: 75.8005, address: 'MI Road, Jaipur', registered: true, years_active: 4, created_at: '2021-08-14' },
{ id: 5, name: 'Marigold Guide Circle', service_type: 'Guide', location_id: 1, lat: 26.9855, lng: 75.8513, address: 'Amer Fort Gate 2, Jaipur', registered: false, years_active: 1, created_at: '2024-02-19' },

{ id: 6, name: 'Heritage Trails India', service_type: 'Travel Agency', location_id: 2, lat: 27.1735, lng: 78.0421, address: 'Taj Ganj, Agra', registered: true, years_active: 11, created_at: '2014-03-05' },
{ id: 7, name: 'Yamuna View Residency', service_type: 'Hotel', location_id: 2, lat: 27.1611, lng: 78.0431, address: 'Fatehabad Road, Agra', registered: true, years_active: 7, created_at: '2018-09-23' },
{ id: 8, name: 'Marble Lane Guides', service_type: 'Guide', location_id: 2, lat: 27.1751, lng: 78.0421, address: 'West Gate, Agra', registered: false, years_active: 2, created_at: '2023-11-01' },
{ id: 9, name: 'Sunrise Photo Walk Co.', service_type: 'Activity / Local Service', location_id: 2, lat: 27.1798, lng: 78.0339, address: 'Mehtab Bagh, Agra', registered: true, years_active: 3, created_at: '2022-07-08' },

{ id: 10, name: 'BlueLake Travels', service_type: 'Travel Agency', location_id: 3, lat: 15.5527, lng: 73.7517, address: 'Calangute, Goa', registered: true, years_active: 8, created_at: '2017-12-12' },
{ id: 11, name: 'Coral Coast Shacks', service_type: 'Activity / Local Service', location_id: 3, lat: 15.5008, lng: 73.8259, address: 'Baga Beach, Goa', registered: false, years_active: 2, created_at: '2023-10-04' },
{ id: 12, name: 'Palolem Palm Rooms', service_type: 'Hotel', location_id: 3, lat: 15.0099, lng: 74.0233, address: 'Palolem, Goa', registered: true, years_active: 5, created_at: '2020-11-19' },
{ id: 13, name: 'Konkan Rider Rentals', service_type: 'Taxi / Local Transport', location_id: 3, lat: 15.4909, lng: 73.8278, address: 'Anjuna, Goa', registered: false, years_active: 1, created_at: '2024-05-30' },

{ id: 14, name: 'Ganga Ghat Haveli', service_type: 'Hotel', location_id: 4, lat: 25.3072, lng: 83.0104, address: 'Dashashwamedh Ghat, Varanasi', registered: true, years_active: 12, created_at: '2013-05-15' },
{ id: 15, name: 'Kashi Boat Collective', service_type: 'Activity / Local Service', location_id: 4, lat: 25.3078, lng: 83.0107, address: 'Assi Ghat, Varanasi', registered: true, years_active: 6, created_at: '2019-08-02' },
{ id: 16, name: 'Sarnath Story Guides', service_type: 'Guide', location_id: 4, lat: 25.3808, lng: 83.0244, address: 'Sarnath, Varanasi', registered: true, years_active: 4, created_at: '2021-02-11' },

{ id: 17, name: 'Capital Gateway Suites', service_type: 'Hotel', location_id: 5, lat: 28.6353, lng: 77.2249, address: 'Connaught Place, Delhi', registered: true, years_active: 10, created_at: '2015-06-21' },
{ id: 18, name: 'Chandni Chowk Food Walks', service_type: 'Activity / Local Service', location_id: 5, lat: 28.6562, lng: 77.2306, address: 'Chandni Chowk, Delhi', registered: true, years_active: 5, created_at: '2020-01-09' },
{ id: 19, name: 'NorthStar Holiday Desk', service_type: 'Travel Agency', location_id: 5, lat: 28.6289, lng: 77.2065, address: 'Paharganj, Delhi', registered: false, years_active: 2, created_at: '2023-08-27' },

{ id: 20, name: 'Lakeside Mewar Palace Stay', service_type: 'Hotel', location_id: 6, lat: 24.5757, lng: 73.6832, address: 'Lake Pichola, Udaipur', registered: true, years_active: 14, created_at: '2011-10-01' },
{ id: 21, name: 'Aravalli Trail Operators', service_type: 'Tour Operator', location_id: 6, lat: 24.5906, lng: 73.6828, address: 'City Palace Road, Udaipur', registered: true, years_active: 7, created_at: '2018-04-16' },

{ id: 22, name: 'Beas Valley Cottages', service_type: 'Hotel', location_id: 7, lat: 32.2432, lng: 77.1892, address: 'Old Manali, Manali', registered: true, years_active: 6, created_at: '2019-06-11' },
{ id: 23, name: 'Solang Adventure Desk', service_type: 'Activity / Local Service', location_id: 7, lat: 32.3172, lng: 77.1553, address: 'Solang Valley, Manali', registered: false, years_active: 2, created_at: '2023-12-05' },
{ id: 24, name: 'Himalayan Wheels Transport', service_type: 'Taxi / Local Transport', location_id: 7, lat: 32.2396, lng: 77.1887, address: 'Mall Road, Manali', registered: true, years_active: 5, created_at: '2020-09-18' },

{ id: 25, name: 'Gateway Bay Hotel', service_type: 'Hotel', location_id: 8, lat: 18.9256, lng: 72.8242, address: 'Colaba, Mumbai', registered: true, years_active: 13, created_at: '2012-02-29' },
{ id: 26, name: 'Marine Drive Heritage Walks', service_type: 'Activity / Local Service', location_id: 8, lat: 18.9432, lng: 72.8231, address: 'Marine Drive, Mumbai', registered: true, years_active: 4, created_at: '2021-11-23' }];


const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export const reviews: ReviewRecord[] = [
{ id: 1, service_id: 1, rating: 5, text: 'Courtyard rooms were spotless and the staff arranged our fort transfer without any fuss.', author_handle: 'traveller_ns', created_at: daysAgo(18) },
{ id: 2, service_id: 1, rating: 4, text: 'Breakfast was simple but good. Billing matched exactly what was quoted on booking.', author_handle: 'meghna_r', created_at: daysAgo(41) },
{ id: 3, service_id: 1, rating: 5, text: 'Second stay here, prices are consistent and no surprise additions at checkout.', author_handle: 'a_kulkarni', created_at: daysAgo(67) },

{ id: 4, service_id: 3, rating: 5, text: 'Best hotel ever amazing service best hotel in city highly recommend', author_handle: 'user_88213', created_at: daysAgo(6) },
{ id: 5, service_id: 3, rating: 5, text: 'Best hotel ever amazing service best in the city highly recommended', author_handle: 'user_88240', created_at: daysAgo(6) },
{ id: 6, service_id: 3, rating: 5, text: 'Amazing best hotel ever service was best highly recommend this hotel', author_handle: 'user_88261', created_at: daysAgo(5) },
{ id: 7, service_id: 3, rating: 1, text: 'Room rate doubled at check-in and they refused to honour the booking voucher.', author_handle: 'sunil_v', created_at: daysAgo(11) },

{ id: 8, service_id: 5, rating: 5, text: 'Great guide very knowledgeable great tour great guide recommended', author_handle: 'user_51002', created_at: daysAgo(9) },
{ id: 9, service_id: 5, rating: 5, text: 'Very knowledgeable great guide great tour highly recommended guide', author_handle: 'user_51044', created_at: daysAgo(8) },
{ id: 10, service_id: 5, rating: 2, text: 'Quoted one fee at the gate then asked for more once we were inside the fort.', author_handle: 'priya_t', created_at: daysAgo(14) },

{ id: 11, service_id: 6, rating: 5, text: 'Itinerary was accurate, driver was punctual, and the invoice had no hidden line items.', author_handle: 'deepak_m', created_at: daysAgo(22) },
{ id: 12, service_id: 6, rating: 4, text: 'Well organised sunrise slot at the monument, fair pricing for a family of four.', author_handle: 'lisa_w', created_at: daysAgo(52) },

{ id: 13, service_id: 8, rating: 2, text: 'Guide pushed us into a marble showroom for almost an hour instead of the monument tour.', author_handle: 'rohit_b', created_at: daysAgo(7) },
{ id: 14, service_id: 8, rating: 1, text: 'Ticket price he claimed was much higher than the official counter rate.', author_handle: 'anon_traveller', created_at: daysAgo(13) },

{ id: 15, service_id: 10, rating: 4, text: 'Package matched the quote and the beach transfer was on time both ways.', author_handle: 'karan_s', created_at: daysAgo(30) },
{ id: 16, service_id: 11, rating: 1, text: 'Final bill was far above the menu board once the water sports were added.', author_handle: 'nisha_p', created_at: daysAgo(4) },
{ id: 17, service_id: 11, rating: 5, text: 'Awesome shack best food awesome vibe best shack in goa awesome', author_handle: 'user_74119', created_at: daysAgo(3) },
{ id: 18, service_id: 11, rating: 5, text: 'Best shack awesome food best vibe in goa awesome service', author_handle: 'user_74152', created_at: daysAgo(3) },

{ id: 19, service_id: 12, rating: 5, text: 'Quiet, clean cottages and the tariff card was displayed at reception.', author_handle: 'farhan_q', created_at: daysAgo(26) },
{ id: 20, service_id: 13, rating: 2, text: 'They kept my licence as security deposit and returned it only after extra payment.', author_handle: 'tanvi_j', created_at: daysAgo(10) },
{ id: 21, service_id: 14, rating: 5, text: 'Ghat-facing balcony, honest rates, and the boat pickup was included as promised.', author_handle: 'shreya_d', created_at: daysAgo(21) },
{ id: 22, service_id: 15, rating: 4, text: 'Sunrise boat ride was well managed and the per-seat rate was as advertised.', author_handle: 'ajay_k', created_at: daysAgo(35) },
{ id: 23, service_id: 17, rating: 4, text: 'Central location, transparent taxes, and quick check-in even at midnight.', author_handle: 'george_l', created_at: daysAgo(44) },
{ id: 24, service_id: 19, rating: 1, text: 'Paid the advance for a Kashmir package and the office stopped answering calls.', author_handle: 'mohit_a', created_at: daysAgo(8) },
{ id: 25, service_id: 19, rating: 1, text: 'Advance taken, tour cancelled two days before travel, refund still pending.', author_handle: 'seema_c', created_at: daysAgo(15) },
{ id: 26, service_id: 20, rating: 5, text: 'Exceptional lake view service and every charge was explained in advance.', author_handle: 'ira_n', created_at: daysAgo(29) },
{ id: 27, service_id: 21, rating: 5, text: 'Trail operator provided proper safety gear and the quote never changed.', author_handle: 'vikram_h', created_at: daysAgo(38) },
{ id: 28, service_id: 22, rating: 4, text: 'Cosy cottages, honest heating charges, decent food at listed prices.', author_handle: 'nidhi_s', created_at: daysAgo(48) },
{ id: 29, service_id: 23, rating: 2, text: 'Paraglide rate jumped once we reached the launch point, no receipt given.', author_handle: 'akash_g', created_at: daysAgo(5) },
{ id: 30, service_id: 25, rating: 5, text: 'Professional front desk and the corporate rate was honoured without argument.', author_handle: 'ritu_m', created_at: daysAgo(33) },
{ id: 31, service_id: 26, rating: 5, text: 'Well researched heritage walk, fixed per-person price, good crowd control.', author_handle: 'jay_v', created_at: daysAgo(40) },
{ id: 32, service_id: 4, rating: 4, text: 'Meter based fare, driver did not push any shopping stops.', author_handle: 'harsh_l', created_at: daysAgo(24) },
{ id: 33, service_id: 7, rating: 4, text: 'Rooms slightly dated but the tariff was fair and staff were helpful.', author_handle: 'elena_k', created_at: daysAgo(50) },
{ id: 34, service_id: 24, rating: 4, text: 'Reliable valley transfers with rates agreed in writing before departure.', author_handle: 'sagar_p', created_at: daysAgo(55) },
{ id: 35, service_id: 2, rating: 4, text: 'City tour covered everything listed, guide was on time and priced fairly.', author_handle: 'bhavna_r', created_at: daysAgo(19) },
{ id: 36, service_id: 2, rating: 3, text: 'Good tour but the entry tickets were billed separately without prior mention.', author_handle: 'oliver_s', created_at: daysAgo(31) },
{ id: 37, service_id: 16, rating: 5, text: 'Deep knowledge of the site and a fixed, printed rate card.', author_handle: 'devika_m', created_at: daysAgo(27) },
{ id: 38, service_id: 18, rating: 5, text: 'Food walk was excellent value, all tastings included in the quoted price.', author_handle: 'imran_z', created_at: daysAgo(23) },
{ id: 39, service_id: 9, rating: 4, text: 'Photo walk started on time and the guide handled permits transparently.', author_handle: 'lucy_b', created_at: daysAgo(36) }];


export const complaints: ComplaintRecord[] = [
{ id: 1, service_id: 3, category: 'Overcharging', text: 'Hotel charged me extra after check-in beyond the confirmed tariff.', created_at: daysAgo(4) },
{ id: 2, service_id: 3, category: 'Hidden Charges', text: 'They added a service charge at checkout that was never disclosed while booking.', created_at: daysAgo(9) },
{ id: 3, service_id: 3, category: 'Overcharging', text: 'The room rate charged was almost double the amount quoted on the phone.', created_at: daysAgo(12) },
{ id: 4, service_id: 3, category: 'Fake/Misleading Review', text: 'The five star reviews all look copied with the same wording.', created_at: daysAgo(6) },
{ id: 5, service_id: 3, category: 'Poor Service', text: 'Room was not cleaned and the bathroom smelled badly through the stay.', created_at: daysAgo(20) },

{ id: 6, service_id: 5, category: 'Overcharging', text: 'Guide asked for extra money inside the fort after agreeing a fixed fee.', created_at: daysAgo(8) },
{ id: 7, service_id: 5, category: 'Suspicious Service', text: 'He had no licence and pressured us to pay in cash without any receipt.', created_at: daysAgo(16) },
{ id: 8, service_id: 5, category: 'Overcharging', text: 'Charged extra for the same tour that others paid far less for.', created_at: daysAgo(21) },

{ id: 9, service_id: 8, category: 'Suspicious Service', text: 'Guide forced a long shopping stop at a marble emporium for commission.', created_at: daysAgo(7) },
{ id: 10, service_id: 8, category: 'Overcharging', text: 'He claimed the monument ticket cost much more than the official price.', created_at: daysAgo(13) },
{ id: 11, service_id: 8, category: 'Suspicious Service', text: 'Took us to a shop instead of the promised monument tour to earn commission.', created_at: daysAgo(24) },

{ id: 12, service_id: 11, category: 'Hidden Charges', text: 'Final bill included water sport charges that were never mentioned.', created_at: daysAgo(5) },
{ id: 13, service_id: 11, category: 'Overcharging', text: 'Shack billed almost twice the menu price for the same items.', created_at: daysAgo(11) },
{ id: 14, service_id: 11, category: 'Fake/Misleading Review', text: 'Reviews posted the same day with nearly identical sentences.', created_at: daysAgo(3) },

{ id: 15, service_id: 13, category: 'Suspicious Service', text: 'Rental kept my licence as deposit and demanded extra money to return it.', created_at: daysAgo(10) },
{ id: 16, service_id: 13, category: 'Overcharging', text: 'Charged a damage fee for a scratch that already existed at pickup.', created_at: daysAgo(18) },

{ id: 17, service_id: 19, category: 'Suspicious Service', text: 'Agency took the advance and cancelled the tour without any refund.', created_at: daysAgo(8) },
{ id: 18, service_id: 19, category: 'Other', text: 'Booking was cancelled two days before travel and refund is still pending.', created_at: daysAgo(15) },
{ id: 19, service_id: 19, category: 'Suspicious Service', text: 'Office stopped answering after the deposit was paid for the package.', created_at: daysAgo(19) },
{ id: 20, service_id: 19, category: 'Overcharging', text: 'Package price was inflated well above other agencies for the same itinerary.', created_at: daysAgo(26) },

{ id: 21, service_id: 23, category: 'Overcharging', text: 'Paraglide price increased at the launch point and no receipt was given.', created_at: daysAgo(5) },
{ id: 22, service_id: 23, category: 'Hidden Charges', text: 'Extra camera charge was demanded that was not part of the quote.', created_at: daysAgo(12) },

{ id: 23, service_id: 2, category: 'Hidden Charges', text: 'Entry tickets were billed separately although the package looked inclusive.', created_at: daysAgo(30) },
{ id: 24, service_id: 7, category: 'Poor Service', text: 'Air conditioning did not work for two nights and was not repaired.', created_at: daysAgo(45) },
{ id: 25, service_id: 4, category: 'Other', text: 'Driver arrived late for the airport transfer and the route was longer than needed.', created_at: daysAgo(39) },
{ id: 26, service_id: 15, category: 'Poor Service', text: 'Boat was overcrowded compared to the seats we had paid for.', created_at: daysAgo(58) },
{ id: 27, service_id: 12, category: 'Other', text: 'Late night check-in took very long because reception was unattended.', created_at: daysAgo(62) },
{ id: 28, service_id: 1, category: 'Other', text: 'Requested an early breakfast which was not arranged as promised.', created_at: daysAgo(70) }];


export const incidents: IncidentRecord[] = [
{ id: 1, service_id: 3, location_id: 1, severity: 3, summary: 'Repeated tariff dispute reports filed against an unregistered stay near Amer Road.', created_at: daysAgo(9) },
{ id: 2, service_id: 5, location_id: 1, severity: 2, summary: 'Unlicensed guide activity reported at the fort entrance.', created_at: daysAgo(14) },
{ id: 3, service_id: null, location_id: 1, severity: 2, summary: 'Cluster of fare disputes reported around the walled city during peak weeks.', created_at: daysAgo(21) },
{ id: 4, service_id: 8, location_id: 2, severity: 3, summary: 'Commission-driven shopping detours reported on monument tours.', created_at: daysAgo(11) },
{ id: 5, service_id: null, location_id: 2, severity: 1, summary: 'Ticket price misrepresentation reported near the west gate.', created_at: daysAgo(28) },
{ id: 6, service_id: 11, location_id: 3, severity: 2, summary: 'Beachfront billing disputes clustered along a single stretch.', created_at: daysAgo(6) },
{ id: 7, service_id: 13, location_id: 3, severity: 2, summary: 'Two-wheeler rental deposit disputes reported repeatedly.', created_at: daysAgo(12) },
{ id: 8, service_id: 19, location_id: 5, severity: 3, summary: 'Advance payment collected for packages that were later cancelled.', created_at: daysAgo(10) },
{ id: 9, service_id: 23, location_id: 7, severity: 2, summary: 'Adventure activity pricing changed at point of service.', created_at: daysAgo(7) },
{ id: 10, service_id: null, location_id: 4, severity: 1, summary: 'Isolated boat seat overselling report at a busy ghat.', created_at: daysAgo(48) }];


/** Reports already in the queue so the authority workspace is never empty. */
export const seedReports: Omit<ServiceReportRecord, 'cluster_label'>[] = [
{ id: 1, user_id: 2, service_id: 3, service_name: 'Amber Gate Guesthouse', location_id: 1, city: 'Jaipur', category: 'Overcharging', description: 'Tariff was raised at check-in and the staff refused to honour the confirmed booking price.', paid_price: 7800, incident_date: daysAgo(4), evidence_name: 'checkin-bill.jpg', status: 'Pending', created_at: daysAgo(4), updated_at: daysAgo(4), admin_note: null },
{ id: 2, user_id: 2, service_id: 8, service_name: 'Marble Lane Guides', location_id: 2, city: 'Agra', category: 'Suspicious Service', description: 'Guide spent most of the tour inside a showroom and quoted an inflated monument ticket price.', paid_price: 3200, incident_date: daysAgo(7), evidence_name: null, status: 'Under Review', created_at: daysAgo(7), updated_at: daysAgo(3), admin_note: 'Cross-checking with the licensing register.' },
{ id: 3, user_id: 2, service_id: 19, service_name: 'NorthStar Holiday Desk', location_id: 5, city: 'Delhi', category: 'Suspicious Service', description: 'Advance collected for a package that was cancelled two days before departure, refund pending.', paid_price: 24000, incident_date: daysAgo(8), evidence_name: 'payment-receipt.png', status: 'Pending', created_at: daysAgo(8), updated_at: daysAgo(8), admin_note: null },
{ id: 4, user_id: 2, service_id: 11, service_name: 'Coral Coast Shacks', location_id: 3, city: 'Goa', category: 'Hidden Charges', description: 'Water sports charges appeared on the bill without ever being quoted.', paid_price: 6100, incident_date: daysAgo(5), evidence_name: null, status: 'Pending', created_at: daysAgo(5), updated_at: daysAgo(5), admin_note: null },
{ id: 5, user_id: 2, service_id: 23, service_name: 'Solang Adventure Desk', location_id: 7, city: 'Manali', category: 'Overcharging', description: 'Paragliding rate increased at the launch point and no receipt was provided.', paid_price: 4500, incident_date: daysAgo(5), evidence_name: null, status: 'Under Review', created_at: daysAgo(5), updated_at: daysAgo(2), admin_note: 'Operator contacted for response.' },
{ id: 6, user_id: 2, service_id: 13, service_name: 'Konkan Rider Rentals', location_id: 3, city: 'Goa', category: 'Suspicious Service', description: 'Licence retained as deposit and extra payment demanded before returning it.', paid_price: 2800, incident_date: daysAgo(10), evidence_name: null, status: 'Resolved', created_at: daysAgo(10), updated_at: daysAgo(1), admin_note: 'Operator issued refund and updated deposit policy.' },
{ id: 7, user_id: 2, service_id: 5, service_name: 'Marigold Guide Circle', location_id: 1, city: 'Jaipur', category: 'Overcharging', description: 'Additional cash demanded inside the fort after a fixed fee was agreed.', paid_price: 2600, incident_date: daysAgo(8), evidence_name: null, status: 'Pending', created_at: daysAgo(8), updated_at: daysAgo(8), admin_note: null },
{ id: 8, user_id: 2, service_id: 7, service_name: 'Yamuna View Residency', location_id: 2, city: 'Agra', category: 'Poor Service', description: 'Air conditioning did not work for two nights and no alternative room was offered.', paid_price: 4100, incident_date: daysAgo(20), evidence_name: null, status: 'Rejected', created_at: daysAgo(20), updated_at: daysAgo(12), admin_note: 'Operator provided maintenance log; treated as a service lapse, not a pricing risk.' },
{ id: 9, user_id: 2, service_id: 3, service_name: 'Amber Gate Guesthouse', location_id: 1, city: 'Jaipur', category: 'Fake/Misleading Review', description: 'A batch of five star reviews with nearly identical sentences appeared in one day.', paid_price: null, incident_date: daysAgo(6), evidence_name: null, status: 'Under Review', created_at: daysAgo(6), updated_at: daysAgo(2), admin_note: null },
{ id: 10, user_id: 2, service_id: 2, service_name: 'Pink City Tours', location_id: 1, city: 'Jaipur', category: 'Hidden Charges', description: 'Monument entry tickets were billed separately though the package appeared inclusive.', paid_price: 9200, incident_date: daysAgo(30), evidence_name: null, status: 'Resolved', created_at: daysAgo(30), updated_at: daysAgo(22), admin_note: 'Operator updated the package inclusions on all listings.' }];


export const demoUsers = [
{
  id: 1,
  email: 'admin@yatrashield.demo',
  password: 'Admin@123',
  full_name: 'Ananya Rao',
  role: 'admin' as const,
  home_city: 'Delhi',
  phone: '+91 98100 00001'
},
{
  id: 2,
  email: 'tourist@yatrashield.demo',
  password: 'Tourist@123',
  full_name: 'Rohan Mehta',
  role: 'tourist' as const,
  home_city: 'Pune',
  phone: '+91 98200 00002'
}];


export const BACKGROUNDS = {
  india: "/India.jpg",
  heritage: "/im3.jpg",
  sunset: "/im4.jpg",
  arch: "/im5.jpg",
  rajasthan: "/im6.jpg",
  varanasi: "/Sunrise_Over_Varanasi_Ghats.jpg"
};