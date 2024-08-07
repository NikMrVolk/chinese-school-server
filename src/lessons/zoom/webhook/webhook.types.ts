export type EndedLessonWebhook = {
    event: string
    event_ts: number
    payload: {
        account_id: string
        object: {
            id: string
            uuid: string
            host_id: string
            topic: string
            type: number
            start_time: string
            timezone: string
            duration: number
            end_time: string
        }
    }
}
