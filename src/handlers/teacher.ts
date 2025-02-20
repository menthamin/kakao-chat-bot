import type {
	APIGatewayProxyEventV2,
	APIGatewayProxyStructuredResultV2,
	Context,
	Handler,
} from "aws-lambda";
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { PROMPT } from '../prompt/teacher-v0.1';
import { KakaoChatbotEvent, KakaoChatbotEventData } from "../models/KakaoChatbotEvent";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODEL = "gemini-1.5-flash";
const INPUT_TOKEN_COST = 0.0000025;
const OUTPUT_TOKEN_COST = 0.000005;

async function runAI(message: string) {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `
	${PROMPT}
  ### 사용자 질문
  # Input: ${message}
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
	const { body } = JSON.parse(text);
	
	// ✅ 토큰 비용 계산
	const metadata = response.usageMetadata;
	const inputTokens = metadata?.promptTokenCount || 0;
	const outputTokens = metadata?.candidatesTokenCount || 0;
	const inputCost = inputTokens * INPUT_TOKEN_COST // 입력 토큰 비용
	const outputCost = outputTokens * OUTPUT_TOKEN_COST // 출력 토큰 비용
	const totalCost = inputCost + outputCost;  // 총 비용
	
	// console.log("메타데이터:", metadata);
	console.log(`🔹 예상 비용: $${totalCost.toFixed(6)} (입력: $${inputCost.toFixed(6)}, 출력: $${outputCost.toFixed(6)})`);
	
	return { ...body, cost: totalCost };
}

export const handler: Handler = async (
	_event: APIGatewayProxyEventV2,
	_context: Context,
): Promise<APIGatewayProxyStructuredResultV2> => {
	if (!_event.body) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "Bad Request" }),
		};
	}
	const eventData: KakaoChatbotEventData = JSON.parse(_event.body);
	const chatbotEvent = new KakaoChatbotEvent(eventData);
	console.log("전체 데이터:", chatbotEvent.toJSON());
	
	console.log("질문:", chatbotEvent.getQuestion()); 
	console.log("사용자 ID:", chatbotEvent.getUserId()); 
	console.log("콜백 URL:", chatbotEvent.getCallbackUrl()); 

	const res = await runAI(chatbotEvent.getQuestion());
	const returnData: { ko: string; en: string; next: string; point_1?: string; point_2?: string; pn?: string } = {
		ko: res.ko,
		en: res.en,
		next: res.next,
	}

	switch (res.points.length) {
		case 1:
			returnData.point_1 = res.points[0],
			returnData.point_2 = "...";
			break;
		case 2:
			returnData.point_1 = res.points[0]
			returnData.point_2 = res.points[1]
			break;
		default:
			break;
	}

	if (res.np) {
		returnData.pn = res.np
	}

	return {
		statusCode: 200,
		body: JSON.stringify({
			"version": "2.0",
			"data": returnData,
		}),
	}
};

// 실행 방법: ts-node src/handler/tearcher.ts
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
	(async () => {
		const res = await handler(
			{
				body: JSON.stringify({
					query: "I goes to school every day.",
				}),
			} as any,
			{} as any,
			{} as any,
		);

		if (!res || typeof res === "string" || !res.body) return;
		console.log(res.statusCode, JSON.parse(res.body));
	})();
}
