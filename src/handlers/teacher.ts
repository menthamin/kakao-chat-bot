import type {
	APIGatewayProxyEventV2,
	APIGatewayProxyStructuredResultV2,
	Context,
	Handler,
} from "aws-lambda";
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { PROMPT } from '../prompt/teacher-v0.2';
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
  let text = response.text();
	console.log("before text:", text);

	// if test start with ```json then remove it, end with ``` then remove it
	if (text.startsWith("```json")) {
		text = text.slice(7);
	}
	if (text.endsWith("```\n")) {
		text = text.slice(0, -4);
	}
	if (text.endsWith("```")) {
		text = text.slice(0, -3);
	}
	console.log("Response:", text);
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
	const returnData: { ko: string; en: string; next: string; point_1?: string; point_2?: string; np_content?: string; np?: string, np_pronounce?: string } = {
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
		returnData.np_content = `🇰🇷: ${res.ko} 를 네팔어로 번역한 문장과 발음`;
		returnData.np = `🇳🇵: ${res.np}`
		returnData.np_pronounce = `🤓: ${res.np_pronounce}`
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
						"intent": {
							"id": "p0gs40h219npbp4z96ot0st1",
							"name": "블록 이름"
						},
						"userRequest": {
							"timezone": "Asia/Seoul",
							"params": {
								"ignoreMe": "true"
							},
							"block": {
								"id": "p0gs40h219npbp4z96ot0st1",
								"name": "블록 이름"
							},
							"utterance": "네팔 만나서 반갑습니다.",
							"lang": null,
							"user": {
								"id": "434474",
								"type": "accountId",
								"properties": {}
							}
						},
						"bot": {
							"id": "67b1be031e098a447d58f6ac",
							"name": "봇 이름"
						},
						"action": {
							"name": "vbg3qr5l08",
							"clientExtra": null,
							"params": {},
							"id": "z34b316w49k56j7z5jgnjq19",
							"detailParams": {}
						}
				}),
			} as unknown as KakaoChatbotEventData,
			{} as any,
			{} as any,
		);

		if (!res || typeof res === "string" || !res.body) return;
		console.log(res.statusCode, JSON.parse(res.body));
	})();
}
