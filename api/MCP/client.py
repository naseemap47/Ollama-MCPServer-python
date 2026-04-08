from typing import Optional
from contextlib import AsyncExitStack
import traceback
from utils.logger import logger
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from ollama import chat


class MCPClient:
    def __init__(self):
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self.llm = chat
        self.tools = []
        self.messages = []
        self.logger = logger

    # Connect MCP Server
    async def connect_to_server(self, server_script_path: str):
        try:
            is_python = server_script_path.endswith(".py")
            is_js = server_script_path.endswith(".js")
            if not (is_python or is_js):
                raise ValueError("Server script must be in .py or .js")
            command = "python" if is_python else "node"
            server_params = StdioServerParameters(
                command=command, args=[server_script_path], env=None
            )

            stdio_transport = await self.exit_stack.enter_async_context(
                stdio_client(server_params)
            )
            self.stdio, self.write = stdio_transport
            self.session = await self.exit_stack.enter_async_context(
                ClientSession(self.stdio, self.write)
            )

            await self.session.initialize()
            self.logger.info("Connected to MCP Server")

            mcp_tools = await self.get_mcp_tools()
            # print(mcp_tools.tools)
            # for i in mcp_tools.tools:
            #     print(i)
            self.tools = [
                {
                    'type': 'function',
                    'function': {
                        'name': tool.name,
                        'description': tool.description,
                        'parameters': tool.inputSchema,
                    }
                }
                for tool in mcp_tools
            ]

            self.logger.info(f"Available tools: {self.tools}")
            # self.logger.info(
            #     f"Available tools: {[tool['name'] for tool in self.tools]}"
            # )
            
            return True

        except Exception as e:
            self.logger.error(f"Error connecting to MCP Server: {e}")
            traceback.print_exc()
            raise

    # Get MCP Tool List
    async def get_mcp_tools(self):
        try:
            response = await self.session.list_tools()
            return response.tools
        except Exception as e:
            self.logger.error(f"Error getting MCP Tools: {e}")
            raise

    # Process Query
    async def process_query(self, query: str):
        try:
            self.logger.info(f"Process query: {query}")
            self.messages = [{"role": "user", "content": query}]

            while True:
                response = await self.call_llm()
                self.logger.info(f"Model Response:\n {response.message}")
                # response a tool call
                if response.message.tool_calls:
                    assistant_message = {
                        "role": "assistant",
                        "content": response.message.content
                    }
                    self.logger.info(f"Tool Call:\n{assistant_message}")
                    self.messages.append(assistant_message)
                    for tool in response.message.tool_calls:
                        tool_name = tool.function.name
                        tool_args = tool.function.arguments
                        self.logger.info(
                            f"Calling tool: {tool_name} with args: {tool_args}"
                        )
                        try:
                            result = await self.session.call_tool(tool_name, tool_args)
                            self.logger.info(f"Tool: {tool_name}\nResult: {result}")
                            assistant_message = {
                                "role": "tool",
                                'content': str(result.content) 
                            }
                            self.messages.append(assistant_message)
                        except Exception as e:
                            self.logger.error(f"Error Calling tool {tool_name}: {e}")
                            raise

                # reposnse a text msg
                else:
                    assistant_message = {
                        "role": "assistant",
                        "content": response.message.content
                    }
                    self.messages.append(assistant_message)
                    break
            
            return self.messages
            
        except Exception as e:
            self.logger.error(f"Error processing query: {e}")
            raise
    
    # Call LLM
    async def call_llm(self):
        try:
            self.logger.info("Calling LLM")
            result = self.llm(
                model="qwen3.5:9b",
                messages=self.messages,
                tools=self.tools,
                think="high"
            )
            return result
        except Exception as e:
            self.logger.error(f"Error calling LLM: {e}")
            raise
            
    # Process Query Stream
    async def process_query_stream(self, query: str):
        from ollama import AsyncClient
        client_async = AsyncClient()
        try:
            self.logger.info(f"Process query stream: {query}")
            self.messages = [{"role": "user", "content": query}]
            
            yield {"type": "status", "message": "Thinking..."}

            while True:
                self.logger.info("Calling Async LLM stream")
                stream = await client_async.chat(
                    model="qwen3.5:9b",
                    messages=self.messages,
                    tools=self.tools,
                    stream=True
                )
                
                full_content = ""
                # We will collect unique tool_calls
                tool_calls = []
                
                async for chunk in stream:
                    if getattr(chunk.message, 'content', None):
                        full_content += chunk.message.content
                        yield {"type": "chunk", "text": chunk.message.content}
                        
                    if getattr(chunk.message, 'tool_calls', None):
                        # Some versions of ollama yield tool calls repeatedly or piece-meal. 
                        # We'll just collect them and use the final set.
                        for t in chunk.message.tool_calls:
                            # To avoid dupes, check if it exists or just rely on ollama sending them fully at the end.
                            if t not in tool_calls:
                                tool_calls.append(t)

                if tool_calls:
                    assistant_message = {
                        "role": "assistant",
                        "content": full_content,
                        "tool_calls": tool_calls
                    }
                    self.messages.append(assistant_message)
                    
                    for tool in tool_calls:
                        tool_name = tool.function.name
                        tool_args = tool.function.arguments
                        self.logger.info(f"Calling tool: {tool_name} with args: {tool_args}")
                        
                        yield {"type": "tool_call", "tool_name": tool_name, "args": tool_args, "thought": full_content}
                        
                        try:
                            result = await self.session.call_tool(tool_name, tool_args)
                            self.logger.info(f"Tool {tool_name} Result: {result}")
                            yield {"type": "tool_result", "tool_name": tool_name, "result": str(result.content)}
                            
                            self.messages.append({
                                "role": "tool",
                                "content": str(result.content)
                            })
                        except Exception as e:
                            self.logger.error(f"Error calling tool {tool_name}: {e}")
                            err_msg = f"Error: {e}"
                            self.messages.append({"role": "tool", "content": err_msg})
                            yield {"type": "tool_result", "tool_name": tool_name, "result": err_msg}
                else:
                    assistant_message = {
                        "role": "assistant",
                        "content": full_content
                    }
                    self.messages.append(assistant_message)
                    break
                    
            # yield {"type": "end"}

        except Exception as e:
            self.logger.error(f"Error processing query stream: {e}")
            yield {"type": "error", "message": str(e)}
            

    # CleanUp
    async def cleanup(self):
        try:
            await self.exit_stack.aclose()
            self.logger.info("Disconnected from MCP Server")
        except Exception as e:
            self.logger.error(f"Error during cleanup: {e}")
            traceback.print_exc()
            raise
    # Extra
    # Log Conversation
