export type GetMeetingQueryParams = {
    type?: 'scheduled' | 'live' | 'upcoming' | 'upcoming_meetings' | 'previous_meetings'
    page_size?: number
    next_page_token?: string
    page_number?: number
    from?: string
    to?: string
    timezone?: string
}

export type Meeting = {
    uuid: string
    id: number
    host_id: string
    topic: string
    type: 2
    start_time: string
    duration: 60
    timezone: string
    created_at: string
    join_url: string
}

export type MeetingsResponse = {
    page_count: number
    page_number?: number
    next_page_token: string
    meetings: Meeting[]
}

export type MeetingCreateBody = {
    topic: string
    start_time: string
}

export type MeetingUpdateType = {
    start_time: string
}

export type GetPastMeetingDetailsResponse = {
    next_page_token: string
    page_count: number
    page_size: number
    total_records: number
    participants: {
        id: string
        name: string
        user_id: number
        registrant_id: string
        user_email: string
        join_time: string
        leave_time: string
        duration: number
        failover: boolean
        status: string
    }[]
}
