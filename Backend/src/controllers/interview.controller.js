const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")




/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Resume file is required." })
        }

        const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()
        const { selfDescription, jobDescription } = req.body

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeContent.text,
            selfDescription,
            jobDescription
        })

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeContent.text,
            selfDescription,
            jobDescription,
            ...interViewReportByAi
        })

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })
    } catch (error) {
        console.error("generateInterViewReportController error:", error)

        if (error.status === 503) {
            return res.status(503).json({
                message: "The AI service is currently overloaded. Please try again in a moment."
            })
        }

        if (error.status === 429) {
            return res.status(429).json({
                message: "The AI service is rate limited. Please try again shortly."
            })
        }

        if (error.status === 502) {
            return res.status(502).json({
                message: error.message
            })
        }

        res.status(500).json({
            message: "Failed to generate interview report.",
            error: error.message
        })
    }
}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params

        const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        })
    } catch (error) {
        console.error("getInterviewReportByIdController error:", error)

        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid interview report id." })
        }

        res.status(500).json({
            message: "Failed to fetch interview report.",
            error: error.message
        })
    }
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

        res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        })
    } catch (error) {
        console.error("getAllInterviewReportsController error:", error)

        res.status(500).json({
            message: "Failed to fetch interview reports.",
            error: error.message
        })
    }
}


/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params

        const interviewReport = await interviewReportModel.findById(interviewReportId)

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        const { resume, jobDescription, selfDescription } = interviewReport

        const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
        })

        res.send(pdfBuffer)
    } catch (error) {
        console.error("generateResumePdfController error:", error)

        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid interview report id." })
        }

        if (error.status === 503) {
            return res.status(503).json({
                message: "The AI service is currently overloaded. Please try again in a moment."
            })
        }

        if (error.status === 429) {
            return res.status(429).json({
                message: "The AI service is rate limited. Please try again shortly."
            })
        }

        res.status(500).json({
            message: "Failed to generate resume PDF.",
            error: error.message
        })
    }
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }