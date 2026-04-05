from mcp.server.fastmcp import FastMCP
from langchain_community.tools import DuckDuckGoSearchResults
from langchain_community.document_loaders import WebBaseLoader

mcp = FastMCP("docs")

USER_AGENT = "docs-app/1.0"

async def search_web(query: str) -> list | None:
    # """ Search the query in web using DuckDuckGo Search"""
    try:
        search = DuckDuckGoSearchResults(output_format="list", num_results=4)
        search_result = search.invoke(query)
        return search_result
    except Exception as e:
        print(f"Error Search the query in web using DuckDuckGo: {e}")
        raise

async def read_url(url: str) -> str:
    try:
        loader = WebBaseLoader(url)
        result_web_read = loader.load()
        return result_web_read[0].page_content
    except Exception as e:
        print(f"Error reading {url} web: {e}")

@mcp.tool()
async def web_search(query: str):
    """
    Web Search Tool to search and read docs, articles and News from web.
    
    Args:
        query: The query to search for (eg. "Who is Elon Musk ?", "How to integrate chroma db with langchain ?")
    
    Returns:
        extracted text
    """
    web_results = await search_web(query)
    if len(web_results) == 0:
        return "No results found"
    else:
        text = ""
        for web_result in web_results:
            text += await read_url(web_result['link'])
        return text

@mcp.tool()
def get_weather(city: str):
    """Get the current weather for a city."""
    return f"The weather in {city} is sunny."

if __name__ == "__main__":
    mcp.run(transport="stdio")
