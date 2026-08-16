// ── 1. Imports ──
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
} from "react"
import { addPropertyControls, ControlType } from "framer"

/*
 * Table of contents
 * 1. Imports
 * 2. Constants
 * 3. Types
 * 4. Pure helper functions
 * 5. Small presentational subcomponents
 * 6. Main component
 * 7. Property controls
 * 8. Styles
 */

// ── 2. Constants ──
const COURSES_URL =
    "https://syncsphere-hiv6.onrender.com/assignment/course-data"
const COUNTRY_URL =
    "https://syncsphere-hiv6.onrender.com/assignment/country-code"

// ── 3. Types ──
interface Course {
    courseName: string
    courseCode: string
    description: string
    mainCategory: string
    shortCourse: string
    courseType: string
    pricePaise: number
    priceUsdCents: number
    mangoId: string
    refundable: boolean
}

type CountryCode = "IN" | "US"

interface CoursesGridProps {
    sectionTitle: string
    accentColor: string
    style?: CSSProperties
}

// ── 4. Pure helper functions ──
function isValidCourse(value: unknown): value is Course {
    if (typeof value !== "object" || value === null) {
        return false
    }

    const course = value as Record<string, unknown>

    return (
        typeof course.courseName === "string" &&
        typeof course.courseCode === "string" &&
        typeof course.description === "string" &&
        typeof course.mainCategory === "string" &&
        typeof course.shortCourse === "string" &&
        typeof course.courseType === "string" &&
        typeof course.pricePaise === "number" &&
        Number.isFinite(course.pricePaise) &&
        Number.isInteger(course.pricePaise) &&
        course.pricePaise >= 0 &&
        typeof course.priceUsdCents === "number" &&
        Number.isFinite(course.priceUsdCents) &&
        Number.isInteger(course.priceUsdCents) &&
        course.priceUsdCents >= 0 &&
        typeof course.mangoId === "string" &&
        typeof course.refundable === "boolean"
    )
}

function formatPrice(
    course: Course,
    country: CountryCode | null
): string {
    if (country === "IN") {
        const rupees = course.pricePaise / 100
        const hasPaise = !Number.isInteger(rupees)

        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: hasPaise ? 2 : 0,
            maximumFractionDigits: 2,
        }).format(rupees)
    }

    if (country === "US") {
        const dollars = course.priceUsdCents / 100

        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(dollars)
    }

    return "Price unavailable"
}

// ── 5. Small presentational subcomponents ──
function CourseCard({
    course,
    country,
    countryLoading,
    accentColor,
}: {
    course: Course
    country: CountryCode | null
    countryLoading: boolean
    accentColor: string
}) {
    return (
        <article className="skillpath-course-card" style={styles.card}>
            <p
                style={{
                    ...styles.category,
                    backgroundColor: accentColor,
                }}
            >
                {course.mainCategory}
            </p>

            <h3 style={styles.courseName}>{course.courseName}</h3>

            <p style={styles.description}>{course.description}</p>

            <p style={styles.price}>
                {countryLoading
                    ? "Loading price..."
                    : formatPrice(course, country)}
            </p>

            {course.refundable && (
                <span
                    style={{
                        ...styles.badge,
                        backgroundColor: accentColor,
                    }}
                >
                    Refundable
                </span>
            )}
        </article>
    )
}

function SkeletonCard() {
    return (
        <div style={styles.card} aria-hidden="true">
            <div
                style={{
                    ...styles.skeleton,
                    width: "35%",
                }}
            />

            <div
                style={{
                    ...styles.skeleton,
                    width: "70%",
                    height: "24px",
                    marginTop: "14px",
                }}
            />

            <div
                style={{
                    ...styles.skeleton,
                    width: "100%",
                    marginTop: "16px",
                }}
            />

            <div
                style={{
                    ...styles.skeleton,
                    width: "85%",
                    marginTop: "8px",
                }}
            />

            <div
                style={{
                    ...styles.skeleton,
                    width: "30%",
                    height: "20px",
                    marginTop: "20px",
                }}
            />
        </div>
    )
}

// ── 6. Main component ──
/**
 * Skillpath courses loaded from the supplied assignment API.
 *
 * @framerIntrinsicWidth 1120
 * @framerIntrinsicHeight 520
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function CoursesGrid({
    sectionTitle = "Explore our courses",
    accentColor = "#6366F1",
    style,
}: CoursesGridProps) {
    // Prevents asynchronous requests from updating state after unmount.
    const isMounted = useRef(true)
    // Prevents duplicate concurrent requests for the courses resource.
    const coursesRequestInFlight = useRef(false)
    // Prevents duplicate concurrent requests for the country resource.
    const countryRequestInFlight = useRef(false)
    // Provides the rendered container whose width determines the column count.
    const containerRef = useRef<HTMLElement | null>(null)

    const [courses, setCourses] = useState<Course[]>([])
    const [coursesLoading, setCoursesLoading] = useState(true)
    const [coursesError, setCoursesError] = useState<string | null>(null)

    const [country, setCountry] = useState<CountryCode | null>(null)
    const [countryLoading, setCountryLoading] = useState(true)
    const [countryError, setCountryError] = useState(false)

    // Stores the measured container width used to derive the responsive columns.
    const [containerWidth, setContainerWidth] = useState(0)

    // These fetchers intentionally share the same readable request lifecycle.
    async function loadCourses() {
        if (!isMounted.current || coursesRequestInFlight.current) {
            return
        }

        coursesRequestInFlight.current = true

        try {
            setCoursesLoading(true)
            setCoursesError(null)
            setCourses([])

            const response = await fetch(COURSES_URL)

            if (!response.ok) {
                throw new Error(
                    `Failed to load courses. Status: ${response.status}`
                )
            }

            const data: unknown = await response.json()

            if (!Array.isArray(data)) {
                throw new Error("Unexpected course response")
            }

            const validCourses = data.filter(isValidCourse)

            if (!isMounted.current) {
                return
            }

            setCourses(validCourses)
        } catch {
            if (isMounted.current) {
                setCoursesError("We couldn't load the courses.")
            }
        } finally {
            coursesRequestInFlight.current = false

            if (isMounted.current) {
                setCoursesLoading(false)
            }
        }
    }

    async function loadCountry() {
        if (!isMounted.current || countryRequestInFlight.current) {
            return
        }

        countryRequestInFlight.current = true

        try {
            setCountryLoading(true)
            setCountry(null)

            const response = await fetch(COUNTRY_URL)

            if (!response.ok) {
                throw new Error(
                    `Failed to load country. Status: ${response.status}`
                )
            }

            const data: unknown = await response.json()

            if (
                typeof data !== "object" ||
                data === null ||
                !("country_code" in data)
            ) {
                throw new Error("Unexpected country response")
            }

            const countryCode = (
                data as { country_code: unknown }
            ).country_code

            if (!isMounted.current) {
                return
            }

            if (countryCode === "IN" || countryCode === "US") {
                setCountry(countryCode)
                setCountryError(false)
            } else {
                throw new Error("Unexpected country response")
            }
        } catch {
            if (isMounted.current) {
                setCountry(null)
                setCountryError(true)
            }
        } finally {
            countryRequestInFlight.current = false

            if (isMounted.current) {
                setCountryLoading(false)
            }
        }
    }

    function loadData() {
        void loadCourses()
        void loadCountry()
    }

    function retryCourses() {
        void loadCourses()

        if (countryError) {
            void loadCountry()
        }
    }

    useEffect(() => {
        isMounted.current = true
        loadData()

        return () => {
            isMounted.current = false
        }
    }, [])

    // useLayoutEffect measures before paint to avoid flashing the wrong column count.
    useLayoutEffect(() => {
        const container = containerRef.current

        if (!container) {
            return
        }

        setContainerWidth(container.getBoundingClientRect().width)

        if (typeof ResizeObserver === "undefined") {
            return
        }

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0]

            if (entry) {
                setContainerWidth(entry.contentRect.width)
            }
        })

        observer.observe(container)

        return () => {
            observer.disconnect()
        }
    }, [])

    const columns =
        containerWidth >= 900
            ? 3
            : containerWidth >= 600
              ? 2
              : 1

    const rootStyle: CSSProperties = {
        ...styles.section,
        ...style,
        position: "relative",
    }

    // State: loading
    if (coursesLoading) {
        return (
            <section
                ref={containerRef}
                style={rootStyle}
                aria-busy="true"
                aria-label="Loading courses"
            >
                <h2 style={styles.sectionTitle}>{sectionTitle}</h2>

                <div
                    style={{
                        ...styles.grid,
                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                    }}
                >
                    {Array.from({ length: 6 }).map((_, index) => (
                        <SkeletonCard key={`skeleton-${index}`} />
                    ))}
                </div>
            </section>
        )
    }

    // State: error
    if (coursesError) {
        return (
            <section ref={containerRef} style={rootStyle}>
                <h2 style={styles.sectionTitle}>{sectionTitle}</h2>

                <div style={styles.errorState} role="alert">
                    <p>{coursesError}</p>

                    <button
                        type="button"
                        onClick={retryCourses}
                        style={{
                            ...styles.retryButton,
                            backgroundColor: accentColor,
                        }}
                    >
                        Try Again
                    </button>
                </div>
            </section>
        )
    }

    // State: zero results
    if (courses.length === 0) {
        return (
            <section ref={containerRef} style={rootStyle}>
                <h2 style={styles.sectionTitle}>{sectionTitle}</h2>
                <p>No courses are available right now.</p>
            </section>
        )
    }

    // State: success
    return (
        <section ref={containerRef} style={rootStyle}>
            <h2 style={styles.sectionTitle}>{sectionTitle}</h2>

            <style>{`
                .skillpath-course-card {
                    transition: transform 180ms ease, box-shadow 180ms ease;
                }

                @media (hover: hover) {
                    .skillpath-course-card:hover {
                        transform: translate(4px, 4px);
                        box-shadow: 2px 2px 0 #172033 !important;
                    }
                }
            `}</style>

            {countryError && (
                <div
                    style={styles.countryErrorState}
                    role="status"
                    aria-live="polite"
                >
                    <p style={styles.countryMessage}>
                        We couldn't detect your region, so prices are
                        temporarily unavailable.
                    </p>

                    <button
                        type="button"
                        onClick={() => void loadCountry()}
                        disabled={countryLoading}
                        style={{
                            ...styles.retryButton,
                            backgroundColor: accentColor,
                            cursor: countryLoading ? "not-allowed" : "pointer",
                            opacity: countryLoading ? 0.7 : 1,
                        }}
                    >
                        {countryLoading ? "Retrying price..." : "Retry price"}
                    </button>
                </div>
            )}

            <div
                style={{
                    ...styles.grid,
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
            >
                {courses.map((course) => (
                    <CourseCard
                        key={course.courseCode}
                        course={course}
                        country={country}
                        countryLoading={countryLoading}
                        accentColor={accentColor}
                    />
                ))}
            </div>
        </section>
    )
}

// ── 7. Property controls ──
addPropertyControls(CoursesGrid, {
    sectionTitle: {
        type: ControlType.String,
        title: "Section Title",
        defaultValue: "Explore our courses",
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent Color",
        defaultValue: "#6366F1",
    },
})

// ── 8. Styles ──
const styles = {
    // Layout
    section: {
        position: "relative" as const,
        width: "100%",
        minWidth: 0,
        height: "auto",
        boxSizing: "border-box" as const,
        overflowX: "hidden" as const,
    },
    sectionTitle: {
        margin: "0 0 24px 0",
        fontSize: "32px",
        lineHeight: "1.15",
        fontWeight: 800,
        letterSpacing: "-0.03em",
        overflowWrap: "anywhere" as const,
    },
    grid: {
        display: "grid",
        alignItems: "stretch",
        gap: "28px",
        width: "100%",
        minWidth: 0,
        padding: "0 7px 7px 0",
        boxSizing: "border-box" as const,
    },

    // Card content
    card: {
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box" as const,
        padding: "22px",
        border: "3px solid #172033",
        borderRadius: "8px",
        backgroundColor: "#fffdf7",
        boxShadow: "6px 6px 0 #172033",
    },
    category: {
        display: "inline-block",
        width: "fit-content",
        margin: "0 0 14px 0",
        padding: "5px 9px",
        border: "2px solid #172033",
        borderRadius: "4px",
        color: "#ffffff",
        fontSize: "13px",
        lineHeight: "1.2",
        fontWeight: 800,
        letterSpacing: "0.01em",
        overflowWrap: "anywhere" as const,
    },
    courseName: {
        margin: "0 0 12px 0",
        fontSize: "22px",
        lineHeight: "1.2",
        fontWeight: 800,
        letterSpacing: "-0.02em",
        overflowWrap: "anywhere" as const,
    },
    description: {
        margin: "0 0 18px 0",
        lineHeight: "1.5",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical" as const,
        overflow: "hidden",
    },
    price: {
        margin: 0,
        fontSize: "17px",
        fontWeight: 800,
        overflowWrap: "anywhere" as const,
    },
    badge: {
        display: "inline-block",
        width: "fit-content",
        marginTop: "16px",
        padding: "5px 9px",
        border: "2px solid #172033",
        borderRadius: "4px",
        boxShadow: "3px 3px 0 #172033",
        fontSize: "12px",
        fontWeight: 800,
        color: "#ffffff",
    },

    // Loading
    skeleton: {
        height: "14px",
        borderRadius: "6px",
        backgroundColor: "#e5e7eb",
    },

    // Interactive and status states
    retryButton: {
        border: "2px solid #172033",
        borderRadius: "6px",
        padding: "10px 16px",
        boxShadow: "4px 4px 0 #172033",
        color: "#ffffff",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 800,
    },
    errorState: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "flex-start",
        gap: "12px",
    },
    countryMessage: {
        margin: 0,
    },
    countryErrorState: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "flex-start",
        gap: "10px",
        margin: "0 0 16px 0",
    },
}
