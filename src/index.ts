import { Hono } from 'hono';
import { stripIndents } from 'common-tags';

const VERBOSE = true;
// const MODEL_NAME = '@hf/nousresearch/hermes-2-pro-mistral-7b';
const MODEL_NAME = '@cf/meta/llama-3.1-8b-instruct';

type Bindings = {
	[key in keyof CloudflareBindings]: CloudflareBindings[key];
};

const app = new Hono<{ Bindings: Bindings }>();

async function createNewSurveyTaker(env: Bindings, metadata: any): Promise<number> {
	const result = await env.DB.prepare(
		stripIndents`
		INSERT INTO survey_takers (metadata) VALUES (?);`
	)
		.bind(JSON.stringify(metadata))
		.run();
	return result.meta.last_row_id;
}

async function submitSurvey(env: Bindings, surveyTakerId: number, args) {
	// TODO submit the survey
	// TODO: return enough information to be be a good message
	return { surveyId: 1, message: 'Survey submitted successfully', args };
}

async function getPreviousMessages(env: Bindings, surveyTakerId: number): Promise<RoleScopedChatInput[]> {
	// TODO: Decode id?
	console.log(`Retrieving chat history for ${surveyTakerId}`);
	const result = await env.DB.prepare(
		stripIndents`
		SELECT
			json_message
		FROM chat_history
		WHERE survey_taker_id=?
		ORDER BY creation_date ASC`
	)
		.bind(surveyTakerId)
		.all();
	//
	// @ts-ignore TODO: What's the right way to do this TS wise wrt r.json_message?
	return result.results.map((r) => JSON.parse(r.json_message));
}

async function addToChatHistory(env: Bindings, surveyTakerId: number, message: RoleScopedChatInput) {
	const json_message = JSON.stringify(message);
	console.log(`Storing ${json_message} for ${surveyTakerId}`);
	const result = await env.DB.prepare(
		stripIndents`
		INSERT INTO chat_history
		(survey_taker_id, json_message)
		VALUES (?, ?)`
	)
		.bind(surveyTakerId, json_message)
		.run();
	return result.meta.last_row_id;
}

type ChatAPIResponse = {
	result: any;
	surveyTakerId: number;
	messages?: RoleScopedChatInput[];
};

app.post('/api/chat', async (c) => {
	const payload = await c.req.json();
	// TODO: Ensure clientside is passing this
	let surveyTakerId = payload.surveyTakerId;
	if (surveyTakerId === undefined || surveyTakerId === null) {
		surveyTakerId = await createNewSurveyTaker(c.env, { eventName: payload.eventName });
	}
	const systemMessage = stripIndents`
	You are a curious and thoughtful post-event survey gatherer.

	The user has attended an event named ${payload.eventName} and is going to answer questions about it.

	Your job is to get the user to answer the required questions in the submitSurvey tool, and then call that tool.

	Try to only ask one question at a time.

	After the survey has been successfully submitted, thank the user for their time and remind them how much you value their feedback.

	You should focus only on gathering information about the event, if the user tries to distract you, reshift their focus to the survey.
	`;
	const tools = [
		{
			name: 'submitSurvey',
			description: 'When all required questions are answered, submits the survey',
			parameters: {
				type: 'object',
				properties: {
					eventName: {
						type: 'string',
						description: 'Name of the event the user attended',
					},
					nps: {
						type: 'number',
						description: 'On a scale of 1 to 10, how likely is the user likely to recommend the event',
					},
					attendAgain: {
						type: 'boolean',
						description: 'Does the user plan to attend another event',
					},
					improvements: {
						type: 'string',
						description: 'Suggestions for improvement for how to make the event better',
					},
					favoritePart: {
						type: 'string',
						description: `The user's favorite part of the event`,
					},
					email: {
						type: 'string',
						description: 'Optional email if user wants to be contacted',
					},
				},
				required: ['eventName', 'nps', 'attendAgain'],
			},
		},
	];
	const messages: RoleScopedChatInput[] = [{ role: 'system', content: systemMessage }];
	// Yoink the messages from chat db
	const previousMessages = await getPreviousMessages(c.env, surveyTakerId);
	// Append the previous messages
	previousMessages.forEach((message) => messages.push(message));
	const userMessage: RoleScopedChatInput = { role: 'user', content: payload.message };
	messages.push(userMessage);
	let result: AiTextGenerationOutput = await c.env.AI.run(MODEL_NAME, {
		messages,
		tools,
	});
	await addToChatHistory(c.env, surveyTakerId, userMessage);
	let aiMessage: RoleScopedChatInput;
	if (result.tool_calls?.length > 0) {
		for (const tool_call of result.tool_calls) {
			if (tool_call.name === 'submitSurvey') {
				const resp = await submitSurvey(c.env, surveyTakerId, tool_call.arguments);
				const toolMessage: RoleScopedChatInput = { role: 'ipython', content: JSON.stringify(resp) };
				messages.push(toolMessage);
				await addToChatHistory(c.env, surveyTakerId, toolMessage);
				result = await c.env.AI.run(MODEL_NAME, {
					messages,
					tools,
				});
			}
		}
	}
	// @ts-ignore : TODO: How to make response there?
	if (result.response !== null) {
		aiMessage = { role: 'assistant', content: result.response };
		messages.push(aiMessage);
		await addToChatHistory(c.env, surveyTakerId, aiMessage);
	}
	const response: ChatAPIResponse = { result, surveyTakerId };
	if (VERBOSE === true) {
		response.messages = messages;
	}
	return c.json(response);
});

export default app;
