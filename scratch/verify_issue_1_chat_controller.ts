import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { handleChatQuery } from '../apps/api/modules/chat/controller.js';

async function testChatController() {
    console.log('Testing chat controller and agent state mapping...');
    try {
        const result = await cortexAgent.invoke({ query: 'What repositories exist?' }, { recursionLimit: 15 });
        console.log('\n--- AGENT RESULT RAW KEYS ---');
        console.log(Object.keys(result));

        console.log('\n--- CHECKING STATE PROPERTIES ACCESSED BY CHAT CONTROLLER ---');
        console.log('result.executedTools:', result.executedTools);
        console.log('result.graphAction (accessed at controller.ts:23):', (result as any).graphAction);
        console.log('result.graphTarget (accessed at controller.ts:25):', (result as any).graphTarget);
        console.log('result.graphRelation (accessed at controller.ts:26):', (result as any).graphRelation);

        // Simulate Express request / response
        let responseJson: any = null;
        let responseStatus: number = 0;
        const fakeReq: any = {
            body: { query: 'What repositories exist?' }
        };
        const fakeRes: any = {
            status: (code: number) => {
                responseStatus = code;
                return {
                    json: (data: any) => {
                        responseJson = data;
                        return data;
                    }
                };
            }
        };

        await handleChatQuery(fakeReq, fakeRes);
        console.log('\n--- ACTUAL CHAT CONTROLLER OUTPUT JSON ---');
        console.log('HTTP Status:', responseStatus);
        console.log('Execution block:', JSON.stringify(responseJson?.execution, null, 2));

    } catch (e: any) {
        console.error('Error during test:', e);
    }
    process.exit(0);
}

testChatController();
