import type { SlashCommandCallbackParams } from '@rocket.chat/core-typings';
import { sdk } from '../../utils/client/lib/SDKClient';
import { slashCommands } from '../../utils/client/slashCommand';

// Import EventEmitter
import EventEmitter from 'eventemitter3';

// Create an instance of EventEmitter
export const brainstormEventEmitter = new EventEmitter();

async function fetchMessages(roomId: string): Promise<any[]> {
    const response = await fetch(`http://localhost:3000/api/v1/channels.messages?roomId=${roomId}`, {
        method: 'GET',
        headers: {
            'X-Auth-Token': '',
            'X-User-Id': '',
        },
    });
    const data = await response.json();
    if (!data.success) {
        throw new Error('Failed to fetch messages.');
    }
    return data.messages;
}

async function sendToBrainstormAPI(rootIdea: string, messages: any[]): Promise<string> {
    const formattedMessages = messages.map((msg) => ({
        sender: msg.u?.username || 'unknown',
        text: msg.msg || '',
    }));

    const payload = JSON.stringify({
        rootIdea,
        messages: formattedMessages,
    });
    console.log('Sending payload to BrainstormAPI:', payload);

    const response = await fetch(
        'https://0fthlqtohj.execute-api.us-east-2.amazonaws.com/default/BrainstormAPI',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: payload,
        },
    );

    if (!response.ok) {
        throw new Error(`Failed to send messages to BrainstormAPI: ${response.statusText}`);
    }

    const htmlBody = await response.text();
    const cleanedHtmlBody = htmlBody.replace(/\\/g, '');

    console.log('Received response from BrainstormAPI:', cleanedHtmlBody);

    return cleanedHtmlBody;
}

async function Brainstorm({ message, params }: SlashCommandCallbackParams<'brainstorm'>): Promise<void> {
    try {
        const rootIdea = params.trim();
        if (!rootIdea) {
            throw new Error('You must specify a root idea using the format: /brainstorm <root idea>');
        }
        const roomId = "67956dc5818e2e1c56ca5f67"; // Use the room ID from the message context
        const messages = await fetchMessages(roomId);

        const cleanedHtmlBody = await sendToBrainstormAPI(rootIdea, messages);

        // Emit an event with the cleanedHtmlBody
        brainstormEventEmitter.emit('updateHtmlBody', cleanedHtmlBody);
    } catch (error) {
        console.error('Error in Brainstorm command:', error);
        await sdk.call('sendMessage', {
            ...message,
            msg: 'An error occurred while processing the brainstorm command.',
        });
    }
}

slashCommands.add({
    command: 'brainstorm',
    callback: Brainstorm,
    options: {
        description: 'Fetch messages and send them along with a root idea to BrainstormAPI',
        params: 'idea: <root idea>',
        clientOnly: true,
    },
});
