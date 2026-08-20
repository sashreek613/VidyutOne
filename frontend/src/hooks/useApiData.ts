import { getChargers, getCharger, getSite, getSites, getBooking } from "../services/api";
import { useAsync } from "./useAsync";

export function useSites() {
  return useAsync(() => getSites(), []);
}

export function useSite(siteId: string | undefined) {
  return useAsync(() => {
    if (!siteId) {
      return Promise.reject(new Error("Missing site id"));
    }
    return getSite(siteId);
  }, [siteId]);
}

export function useChargers() {
  return useAsync(() => getChargers(), []);
}

export function useCharger(chargerId: string | undefined) {
  return useAsync(() => {
    if (!chargerId) {
      return Promise.reject(new Error("Missing charger id"));
    }
    return getCharger(chargerId);
  }, [chargerId]);
}

export function useBooking(bookingId: string | undefined) {
  return useAsync(() => {
    if (!bookingId) {
      return Promise.reject(new Error("Missing booking id"));
    }
    return getBooking(bookingId);
  }, [bookingId]);
}
