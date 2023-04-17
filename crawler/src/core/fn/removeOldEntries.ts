import {FeedMap} from "../../types";

type Days = number

export const removeOldEntries = (map: FeedMap, retention: Days): FeedMap => {
  const DAY_IN_MS = 86400000
  const deleteAfter = DAY_IN_MS * retention
  return Object.fromEntries(
    Object.entries(map).filter(
      ([, {created = 0}]) => new Date().getTime() - created < deleteAfter
    )
  )
}