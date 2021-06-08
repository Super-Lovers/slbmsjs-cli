
const searchOptions = {
	shouldSort: true,
	includeMatches: true,
	findAllMatches: true,
	threshold: 0.5,
	keys: ['name', 'fromFolder', 'creationDate', 'url']
};

const queryMethodOptions = {
	type: 'list',
	name: 'method',
	message: 'Select query method',
	choices: [
		'Group',
		'Sort',
		'Keywords',
		'Tags',
		'Settings'
	]
};

const groupByOptions = {
	type: 'list',
	name: 'parameter',
	message: 'Parameter',
	choices: ['Back', 'Address']
};

const sortByOptions = {
	type: 'list',
	name: 'parameter',
	message: 'Parameter',
	choices: ['Back', 'Oldest', 'Newest']
};

const keywordsOptions = {
	type: 'input',
	name: 'keywords',
	message: 'Please enter the keywords to search by: '
};

const browseTagsOptions = {
	type: 'checkbox',
	name: 'parameter',
	message: 'Please select the tags you want to view bookmarks of: ',
	choices: []
};

const removeTagsOptions = {
	type: 'checkbox',
	name: 'parameter',
	message: 'Please select the tags you want to remove: ',
	choices: []
};

const assignTagsOptions = {
	type: 'input',
	name: 'keywords',
	message: 'Please write down the tags you want to assign to the bookmark. (example:) game html javascript csharp leisure: '
};

const settingsOptions = {
	type: 'list',
	name: 'parameter',
	message: 'Option',
	choices: ['Back', 'Validate Bookmarks', 'Re-import bookmarks']
};

const selectedTagsBookmarksOptions = {
	type: 'list',
	name: 'parameter',
	message: 'Option'
};

const useTagsOptions = {
	type: 'list',
	name: 'parameter',
	message: 'Parameter',
	choices: ['Back', 'Browse Tags', 'Assign Tags', 'Remove Tags']
};

module.exports = {
	searchOptions,
	queryMethodOptions,
	groupByOptions,
	sortByOptions,
	keywordsOptions,
	browseTagsOptions,
	assignTagsOptions,
	settingsOptions,
	selectedTagsBookmarksOptions,
	useTagsOptions,
	removeTagsOptions
}
