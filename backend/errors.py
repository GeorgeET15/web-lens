from models import UserFacingError, ErrorCategory

class ErrorFactory:
    """Factory for creating consistent user-facing errors."""
    
    @staticmethod
    def element_not_found(name: str, role: str, block_id: str = None) -> UserFacingError:
        return UserFacingError(
            title="Element not found",
            message=f"WebLens could not find the {role} named '{name}'.",
            reason="The element may not be visible yet, or the page content has changed.",
            suggestion="Check if the element is visible on the page and try picking it again.",
            category=ErrorCategory.ELEMENT_RESOLUTION,
            related_block_id=block_id
        )

    @staticmethod
    def timeout_error(description: str, timeout: int, block_id: str = None) -> UserFacingError:
        return UserFacingError(
            title="Operation timed out",
            message=f"WebLens waited {timeout} seconds for '{description}' but it didn't complete.",
            reason="The page was too slow to respond or the expected state never happened.",
            suggestion="Try increasing the timeout duration or checking if the page is stuck.",
            category=ErrorCategory.TIMING_STATE,
            related_block_id=block_id
        )
    
    @staticmethod
    def configuration_error(message: str, block_id: str = None) -> UserFacingError:
        return UserFacingError(
            title="Configuration Error",
            message=message,
            reason="The block is missing required information.",
            suggestion="Edit the block and ensure all fields are filled out.",
            category=ErrorCategory.CONFIGURATION,
            related_block_id=block_id
        )

    @staticmethod
    def logic_error(message: str, block_id: str = None) -> UserFacingError:
        return UserFacingError(
            title="Logic Error",
            message=message,
            reason="The flow logic reached an impossible state.",
            suggestion="Check your IF/REPEAT conditions.",
            category=ErrorCategory.LOGIC,
            related_block_id=block_id
        )

    @staticmethod
    def unknown_error(original_error: str, block_id: str = None) -> UserFacingError:
        return UserFacingError(
            title="Unexpected Error",
            message="An unexpected error occurred during execution.",
            reason="Something went wrong that WebLens didn't expect. This is likely a temporary system issue.",
            suggestion="Try running the flow again. If it persists, report this issue.",
            category=ErrorCategory.UNSUPPORTED_ACTION, # Fallback
            related_block_id=block_id
        )
