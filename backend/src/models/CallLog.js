import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["incoming", "outgoing", "missed"],
      required: true,
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    status: {
      type: String,
      enum: ["completed", "missed", "declined"],
      default: "missed",
    },
  },
  { timestamps: true }
);

const CallLog = mongoose.model("CallLog", callLogSchema);

export default CallLog;